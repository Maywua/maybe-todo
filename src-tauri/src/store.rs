use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State};

const RETENTION_MS: i64 = 30 * 24 * 60 * 60 * 1000;
const STORE_VERSION: u32 = 1;

pub struct Store {
    inner: Mutex<StoreInner>,
}

struct StoreInner {
    path: PathBuf,
    notes: Vec<Note>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    #[serde(rename = "type")]
    pub note_type: String,
    pub title: String,
    pub content: Value,
    pub order: f64,
    pub created_at: i64,
    pub updated_at: i64,
    pub trashed_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub is_locked: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteInput {
    pub id: String,
    #[serde(rename = "type")]
    pub note_type: String,
    pub title: String,
    pub content: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNoteInput {
    pub id: String,
    pub title: String,
    pub content: Value,
    pub completed_at: Option<i64>,
}

#[derive(Serialize)]
struct StoreFileRef<'a> {
    version: u32,
    notes: &'a [Note],
}

#[derive(Deserialize)]
struct StoreFile {
    version: u32,
    notes: Vec<Note>,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

impl Store {
    pub fn open(app: &AppHandle) -> Result<Self, String> {
        let dir = match std::env::var_os("MAYBE_TODO_DATA_DIR") {
            Some(value) => PathBuf::from(value),
            None => app.path().app_data_dir().map_err(|err| err.to_string())?,
        };
        std::fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
        let path = dir.join("maybe-todo.json");
        let notes = load_notes(&path)?;
        let store = Store {
            inner: Mutex::new(StoreInner { path, notes }),
        };
        store.purge_expired()?;
        Ok(store)
    }

    fn purge_expired(&self) -> Result<usize, String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        let cutoff = now_ms() - RETENTION_MS;
        let before = inner.notes.len();
        inner.notes.retain(|note| match note.trashed_at {
            None => true,
            Some(trashed_at) => trashed_at >= cutoff,
        });
        let removed = before - inner.notes.len();
        if removed > 0 {
            persist(&inner)?;
        }
        Ok(removed)
    }
}

fn load_notes(path: &Path) -> Result<Vec<Note>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let bytes = std::fs::read(path).map_err(|err| format!("读取数据文件失败：{err}"))?;
    if bytes.is_empty() {
        return Ok(Vec::new());
    }
    let file: StoreFile =
        serde_json::from_slice(&bytes).map_err(|err| format!("数据文件解析失败：{err}"))?;
    if file.version > STORE_VERSION {
        return Err(format!(
            "数据文件版本（{}）高于当前应用支持的版本（{}）",
            file.version, STORE_VERSION
        ));
    }
    Ok(file.notes)
}

fn persist(inner: &StoreInner) -> Result<(), String> {
    let payload = serde_json::to_vec_pretty(&StoreFileRef {
        version: STORE_VERSION,
        notes: &inner.notes,
    })
    .map_err(|err| err.to_string())?;

    let temp = inner.path.with_extension("json.tmp");
    std::fs::write(&temp, payload).map_err(|err| format!("写入数据文件失败：{err}"))?;

    if inner.path.exists() {
        let backup = inner.path.with_extension("json.bak");
        let _ = std::fs::copy(&inner.path, &backup);
        std::fs::remove_file(&inner.path).map_err(|err| format!("替换数据文件失败：{err}"))?;
    }
    std::fs::rename(&temp, &inner.path).map_err(|err| format!("替换数据文件失败：{err}"))
}

fn active_sorted(notes: &[Note]) -> Vec<Note> {
    let mut result: Vec<Note> = notes
        .iter()
        .filter(|note| note.trashed_at.is_none())
        .cloned()
        .collect();
    result.sort_by(|left, right| {
        left.order
            .partial_cmp(&right.order)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(left.created_at.cmp(&right.created_at))
    });
    result
}

fn find_index(notes: &[Note], id: &str) -> Result<usize, String> {
    notes
        .iter()
        .position(|note| note.id == id)
        .ok_or_else(|| "便签不存在".to_string())
}

#[tauri::command]
pub fn list_notes(store: State<'_, Store>) -> Result<Vec<Note>, String> {
    let inner = store.inner.lock().map_err(|err| err.to_string())?;
    Ok(active_sorted(&inner.notes))
}

#[tauri::command]
pub fn list_trashed(store: State<'_, Store>) -> Result<Vec<Note>, String> {
    let inner = store.inner.lock().map_err(|err| err.to_string())?;
    let mut result: Vec<Note> = inner
        .notes
        .iter()
        .filter(|note| note.trashed_at.is_some())
        .cloned()
        .collect();
    result.sort_by(|left, right| right.trashed_at.cmp(&left.trashed_at));
    Ok(result)
}

#[tauri::command]
pub fn create_note(store: State<'_, Store>, input: CreateNoteInput) -> Result<Note, String> {
    let mut inner = store.inner.lock().map_err(|err| err.to_string())?;
    let min_order = inner
        .notes
        .iter()
        .filter(|note| note.trashed_at.is_none())
        .map(|note| note.order)
        .fold(0.0_f64, f64::min);
    let now = now_ms();
    let note = Note {
        id: input.id,
        note_type: input.note_type,
        title: input.title,
        content: input.content,
        order: min_order - 1.0,
        created_at: now,
        updated_at: now,
        trashed_at: None,
        completed_at: None,
        is_locked: false,
    };
    inner.notes.push(note.clone());
    persist(&inner)?;
    Ok(note)
}

#[tauri::command]
pub fn update_note(store: State<'_, Store>, input: UpdateNoteInput) -> Result<Note, String> {
    let mut inner = store.inner.lock().map_err(|err| err.to_string())?;
    let index = find_index(&inner.notes, &input.id)?;
    let note = &mut inner.notes[index];
    note.title = input.title;
    note.content = input.content;
    note.completed_at = input.completed_at;
    note.updated_at = now_ms();
    let updated = note.clone();
    persist(&inner)?;
    Ok(updated)
}

#[tauri::command]
pub fn set_lock(store: State<'_, Store>, id: String, locked: bool) -> Result<Note, String> {
    let mut inner = store.inner.lock().map_err(|err| err.to_string())?;
    let index = find_index(&inner.notes, &id)?;
    inner.notes[index].is_locked = locked;
    let updated = inner.notes[index].clone();
    persist(&inner)?;
    Ok(updated)
}

#[tauri::command]
pub fn reorder_notes(store: State<'_, Store>, ids: Vec<String>) -> Result<(), String> {
    let mut inner = store.inner.lock().map_err(|err| err.to_string())?;
    for (index, id) in ids.iter().enumerate() {
        if let Some(note) = inner
            .notes
            .iter_mut()
            .find(|note| &note.id == id && note.trashed_at.is_none())
        {
            note.order = index as f64;
        }
    }
    persist(&inner)
}

#[tauri::command]
pub fn trash_note(store: State<'_, Store>, id: String) -> Result<(), String> {
    let mut inner = store.inner.lock().map_err(|err| err.to_string())?;
    let index = find_index(&inner.notes, &id)?;
    if inner.notes[index].trashed_at.is_none() {
        inner.notes[index].trashed_at = Some(now_ms());
        persist(&inner)?;
    }
    Ok(())
}

#[tauri::command]
pub fn restore_note(store: State<'_, Store>, id: String) -> Result<Note, String> {
    let mut inner = store.inner.lock().map_err(|err| err.to_string())?;
    let index = find_index(&inner.notes, &id)?;
    if inner.notes[index].trashed_at.is_none() {
        return Ok(inner.notes[index].clone());
    }
    let order = inner.notes[index].order;
    let conflict = inner
        .notes
        .iter()
        .any(|note| note.trashed_at.is_none() && note.id != id && note.order == order);
    if conflict {
        let min_order = inner
            .notes
            .iter()
            .filter(|note| note.trashed_at.is_none())
            .map(|note| note.order)
            .fold(0.0_f64, f64::min);
        inner.notes[index].order = min_order - 1.0;
    }
    inner.notes[index].trashed_at = None;
    let restored = inner.notes[index].clone();
    persist(&inner)?;
    Ok(restored)
}

#[tauri::command]
pub fn delete_note_forever(store: State<'_, Store>, id: String) -> Result<(), String> {
    let mut inner = store.inner.lock().map_err(|err| err.to_string())?;
    let index = find_index(&inner.notes, &id)?;
    inner.notes.remove(index);
    persist(&inner)
}

#[tauri::command]
pub fn empty_trash(store: State<'_, Store>) -> Result<(), String> {
    let mut inner = store.inner.lock().map_err(|err| err.to_string())?;
    if inner.notes.iter().any(|note| note.trashed_at.is_some()) {
        inner.notes.retain(|note| note.trashed_at.is_none());
        persist(&inner)?;
    }
    Ok(())
}

#[tauri::command]
pub fn purge_trash(store: State<'_, Store>) -> Result<usize, String> {
    store.purge_expired()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join(format!("test-{name}-{}-{}", std::process::id(), now_ms()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    fn sample_note() -> Note {
        Note {
            id: "note-1".to_string(),
            note_type: "text".to_string(),
            title: "第一条便签".to_string(),
            content: json!({ "version": 1, "format": "plain", "text": "" }),
            order: -1.0,
            created_at: 1,
            updated_at: 2,
            trashed_at: None,
            completed_at: None,
            is_locked: false,
        }
    }

    #[test]
    fn persists_notes_and_reads_them_back() {
        let dir = temp_dir("roundtrip");
        let path = dir.join("maybe-todo.json");
        let inner = StoreInner {
            path: path.clone(),
            notes: vec![sample_note()],
        };

        persist(&inner).expect("persist");
        let loaded = load_notes(&path).expect("load");

        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].id, "note-1");
        assert_eq!(loaded[0].note_type, "text");
        assert_eq!(loaded[0].title, "第一条便签");
        assert_eq!(loaded[0].order, -1.0);
        assert!(!loaded[0].is_locked);

        let raw = std::fs::read_to_string(&path).expect("read raw");
        assert!(raw.contains("\"type\": \"text\""));
        assert!(raw.contains("\"isLocked\": false"));
        assert!(!raw.contains("noteType"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn keeps_active_notes_sorted_by_order() {
        let mut first = sample_note();
        first.id = "a".to_string();
        first.order = 2.0;
        let mut second = sample_note();
        second.id = "b".to_string();
        second.order = -3.0;
        let mut trashed = sample_note();
        trashed.id = "c".to_string();
        trashed.order = -9.0;
        trashed.trashed_at = Some(10);

        let notes = active_sorted(&[first, second, trashed]);
        assert_eq!(notes.len(), 2);
        assert_eq!(notes[0].id, "b");
        assert_eq!(notes[1].id, "a");
    }
}
