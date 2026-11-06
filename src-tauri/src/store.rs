use redb::{Database, ReadableDatabase, ReadableTable, TableDefinition};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State};

const NOTE_META: TableDefinition<&str, &[u8]> = TableDefinition::new("note_meta");
const NOTE_CONTENT: TableDefinition<&str, &[u8]> = TableDefinition::new("note_content");
const RETENTION_MS: i64 = 30 * 24 * 60 * 60 * 1000;
const SUMMARY_LIMIT: usize = 600;
const SUMMARY_LINES: usize = 5;

pub struct Store {
    db: Database,
    inner: Mutex<StoreInner>,
}

struct StoreInner {
    notes: Vec<NoteSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteSummary {
    pub id: String,
    #[serde(rename = "type")]
    pub note_type: String,
    pub title: String,
    pub summary: String,
    pub order: f64,
    pub created_at: i64,
    pub updated_at: i64,
    pub trashed_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub is_locked: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    #[serde(rename = "type")]
    pub note_type: String,
    pub title: String,
    pub summary: String,
    pub content: Value,
    pub order: f64,
    pub created_at: i64,
    pub updated_at: i64,
    pub trashed_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub is_locked: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotePage {
    pub items: Vec<NoteSummary>,
    pub next_cursor: Option<String>,
    pub has_more: bool,
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

#[derive(Deserialize)]
struct LegacyStoreFile {
    notes: Vec<LegacyNote>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyNote {
    id: String,
    #[serde(rename = "type")]
    note_type: String,
    title: String,
    content: Value,
    order: f64,
    created_at: i64,
    updated_at: i64,
    trashed_at: Option<i64>,
    completed_at: Option<i64>,
    is_locked: bool,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn summarize(note_type: &str, content: &Value) -> String {
    let mut lines: Vec<String> = Vec::new();

    if note_type == "todo" {
        if let Some(items) = content.get("items").and_then(Value::as_array) {
            for item in items.iter().take(SUMMARY_LINES) {
                let text = item
                    .get("text")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .trim();
                if text.is_empty() {
                    continue;
                }
                let done = item.get("done").and_then(Value::as_bool).unwrap_or(false);
                lines.push(format!("{} {text}", if done { "✓" } else { "·" }));
            }
        }
    } else if let Some(text) = content.get("text").and_then(Value::as_str) {
        for line in text.lines().take(SUMMARY_LINES) {
            lines.push(line.trim_end().to_string());
        }
    }

    let joined = lines.join("\n");
    let mut result: String = joined.chars().take(SUMMARY_LIMIT).collect();
    if joined.chars().count() > SUMMARY_LIMIT {
        result.push('…');
    }
    result
}

fn note_from(summary: NoteSummary, content: Value) -> Note {
    Note {
        id: summary.id,
        note_type: summary.note_type,
        title: summary.title,
        summary: summary.summary,
        content,
        order: summary.order,
        created_at: summary.created_at,
        updated_at: summary.updated_at,
        trashed_at: summary.trashed_at,
        completed_at: summary.completed_at,
        is_locked: summary.is_locked,
    }
}

fn active_sorted(notes: &[NoteSummary]) -> Vec<NoteSummary> {
    let mut result: Vec<NoteSummary> = notes
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

fn trashed_sorted(notes: &[NoteSummary]) -> Vec<NoteSummary> {
    let mut result: Vec<NoteSummary> = notes
        .iter()
        .filter(|note| note.trashed_at.is_some())
        .cloned()
        .collect();
    result.sort_by(|left, right| right.trashed_at.cmp(&left.trashed_at));
    result
}

fn page_of(items: Vec<NoteSummary>, cursor: Option<&str>, limit: usize) -> NotePage {
    let limit = limit.clamp(1, 200);
    if let Some(value) = cursor {
        if !items.iter().any(|note| note.id == value) {
            return NotePage {
                items: Vec::new(),
                next_cursor: None,
                has_more: false,
            };
        }
    }
    let start = cursor
        .and_then(|value| items.iter().position(|note| note.id == value))
        .map(|index| index + 1)
        .unwrap_or(0);
    let end = (start + limit).min(items.len());
    let slice = if start < items.len() {
        items[start..end].to_vec()
    } else {
        Vec::new()
    };
    let has_more = end < items.len();
    let next_cursor = if has_more {
        slice.last().map(|note| note.id.clone())
    } else {
        None
    };
    NotePage {
        items: slice,
        next_cursor,
        has_more,
    }
}

fn write_meta(transaction: &redb::WriteTransaction, summary: &NoteSummary) -> Result<(), String> {
    let bytes = serde_json::to_vec(summary).map_err(|err| err.to_string())?;
    let mut table = transaction
        .open_table(NOTE_META)
        .map_err(|err| err.to_string())?;
    table
        .insert(summary.id.as_str(), bytes.as_slice())
        .map_err(|err| err.to_string())?;
    Ok(())
}

fn write_content(
    transaction: &redb::WriteTransaction,
    id: &str,
    content: &Value,
) -> Result<(), String> {
    let bytes = serde_json::to_vec(content).map_err(|err| err.to_string())?;
    let mut table = transaction
        .open_table(NOTE_CONTENT)
        .map_err(|err| err.to_string())?;
    table
        .insert(id, bytes.as_slice())
        .map_err(|err| err.to_string())?;
    Ok(())
}

fn remove_note_rows(transaction: &redb::WriteTransaction, id: &str) -> Result<(), String> {
    let mut meta = transaction
        .open_table(NOTE_META)
        .map_err(|err| err.to_string())?;
    meta.remove(id).map_err(|err| err.to_string())?;
    let mut content = transaction
        .open_table(NOTE_CONTENT)
        .map_err(|err| err.to_string())?;
    content.remove(id).map_err(|err| err.to_string())?;
    Ok(())
}

impl Store {
    pub fn open(app: &AppHandle) -> Result<Self, String> {
        let dir = match std::env::var_os("MAYBE_TODO_DATA_DIR") {
            Some(value) => PathBuf::from(value),
            None => app.path().app_data_dir().map_err(|err| err.to_string())?,
        };
        Self::open_at(&dir)
    }

    pub(crate) fn open_at(dir: &Path) -> Result<Self, String> {
        std::fs::create_dir_all(dir).map_err(|err| err.to_string())?;
        let db = Database::create(dir.join("maybe-todo.redb")).map_err(|err| err.to_string())?;

        {
            let transaction = db.begin_write().map_err(|err| err.to_string())?;
            {
                transaction
                    .open_table(NOTE_META)
                    .map_err(|err| err.to_string())?;
                transaction
                    .open_table(NOTE_CONTENT)
                    .map_err(|err| err.to_string())?;
            }
            transaction.commit().map_err(|err| err.to_string())?;
        }

        let mut notes = load_summaries(&db)?;
        if notes.is_empty() {
            notes = migrate_legacy(&db, dir)?;
        }

        let store = Store {
            db,
            inner: Mutex::new(StoreInner { notes }),
        };
        store.purge_expired()?;
        Ok(store)
    }

    fn purge_expired(&self) -> Result<usize, String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        let cutoff = now_ms() - RETENTION_MS;
        let mut removed = Vec::new();
        inner.notes.retain(|note| match note.trashed_at {
            None => true,
            Some(trashed_at) => {
                if trashed_at < cutoff {
                    removed.push(note.id.clone());
                    false
                } else {
                    true
                }
            }
        });
        if removed.is_empty() {
            return Ok(0);
        }
        let transaction = self.db.begin_write().map_err(|err| err.to_string())?;
        for id in &removed {
            remove_note_rows(&transaction, id)?;
        }
        transaction.commit().map_err(|err| err.to_string())?;
        Ok(removed.len())
    }

    pub fn list_page(&self, cursor: Option<String>, limit: usize) -> Result<NotePage, String> {
        let inner = self.inner.lock().map_err(|err| err.to_string())?;
        Ok(page_of(active_sorted(&inner.notes), cursor.as_deref(), limit))
    }

    pub fn list_all(&self) -> Result<Vec<NoteSummary>, String> {
        let inner = self.inner.lock().map_err(|err| err.to_string())?;
        Ok(active_sorted(&inner.notes))
    }

    pub fn list_trash_page(
        &self,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<NotePage, String> {
        let inner = self.inner.lock().map_err(|err| err.to_string())?;
        Ok(page_of(trashed_sorted(&inner.notes), cursor.as_deref(), limit))
    }

    pub fn get_note(&self, id: &str) -> Result<Note, String> {
        let summary = {
            let inner = self.inner.lock().map_err(|err| err.to_string())?;
            inner
                .notes
                .iter()
                .find(|note| note.id == id)
                .cloned()
                .ok_or_else(|| "便签不存在".to_string())?
        };
        let read = self.db.begin_read().map_err(|err| err.to_string())?;
        let table = read
            .open_table(NOTE_CONTENT)
            .map_err(|err| err.to_string())?;
        let value = table
            .get(id)
            .map_err(|err| err.to_string())?
            .ok_or_else(|| "便签内容不存在".to_string())?;
        let content: Value = serde_json::from_slice(value.value()).map_err(|err| err.to_string())?;
        Ok(note_from(summary, content))
    }

    pub fn create_note(&self, input: CreateNoteInput) -> Result<Note, String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        let min_order = inner
            .notes
            .iter()
            .filter(|note| note.trashed_at.is_none())
            .map(|note| note.order)
            .fold(0.0_f64, f64::min);
        let now = now_ms();
        let summary = NoteSummary {
            id: input.id,
            note_type: input.note_type.clone(),
            title: input.title,
            summary: summarize(&input.note_type, &input.content),
            order: min_order - 1.0,
            created_at: now,
            updated_at: now,
            trashed_at: None,
            completed_at: None,
            is_locked: false,
        };
        let transaction = self.db.begin_write().map_err(|err| err.to_string())?;
        write_meta(&transaction, &summary)?;
        write_content(&transaction, &summary.id, &input.content)?;
        transaction.commit().map_err(|err| err.to_string())?;
        inner.notes.push(summary.clone());
        Ok(note_from(summary, input.content))
    }

    pub fn update_note(&self, input: UpdateNoteInput) -> Result<Note, String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        let index = inner
            .notes
            .iter()
            .position(|note| note.id == input.id)
            .ok_or_else(|| "便签不存在".to_string())?;
        let mut summary = inner.notes[index].clone();
        summary.title = input.title;
        summary.summary = summarize(&summary.note_type, &input.content);
        summary.completed_at = input.completed_at;
        summary.updated_at = now_ms();

        let transaction = self.db.begin_write().map_err(|err| err.to_string())?;
        write_meta(&transaction, &summary)?;
        write_content(&transaction, &summary.id, &input.content)?;
        transaction.commit().map_err(|err| err.to_string())?;
        inner.notes[index] = summary.clone();
        Ok(note_from(summary, input.content))
    }

    pub fn set_lock(&self, id: &str, locked: bool) -> Result<NoteSummary, String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        let index = inner
            .notes
            .iter()
            .position(|note| note.id == id)
            .ok_or_else(|| "便签不存在".to_string())?;
        let mut summary = inner.notes[index].clone();
        summary.is_locked = locked;
        let transaction = self.db.begin_write().map_err(|err| err.to_string())?;
        write_meta(&transaction, &summary)?;
        transaction.commit().map_err(|err| err.to_string())?;
        inner.notes[index] = summary.clone();
        Ok(summary)
    }

    pub fn reorder(&self, ids: Vec<String>) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        let positions: std::collections::HashMap<String, usize> = inner
            .notes
            .iter()
            .enumerate()
            .map(|(index, note)| (note.id.clone(), index))
            .collect();
        let transaction = self.db.begin_write().map_err(|err| err.to_string())?;
        let mut updates = Vec::new();
        for (order, id) in ids.iter().enumerate() {
            if let Some(index) = positions.get(id).copied() {
                let note = &mut inner.notes[index];
                if note.trashed_at.is_none() {
                    note.order = order as f64;
                    updates.push(note.clone());
                }
            }
        }
        for summary in &updates {
            write_meta(&transaction, summary)?;
        }
        transaction.commit().map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn trash_note(&self, id: &str) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        let index = inner
            .notes
            .iter()
            .position(|note| note.id == id)
            .ok_or_else(|| "便签不存在".to_string())?;
        if inner.notes[index].trashed_at.is_some() {
            return Ok(());
        }
        inner.notes[index].trashed_at = Some(now_ms());
        let summary = inner.notes[index].clone();
        let transaction = self.db.begin_write().map_err(|err| err.to_string())?;
        write_meta(&transaction, &summary)?;
        transaction.commit().map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn restore_note(&self, id: &str) -> Result<NoteSummary, String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        let index = inner
            .notes
            .iter()
            .position(|note| note.id == id)
            .ok_or_else(|| "便签不存在".to_string())?;
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
        let summary = inner.notes[index].clone();
        let transaction = self.db.begin_write().map_err(|err| err.to_string())?;
        write_meta(&transaction, &summary)?;
        transaction.commit().map_err(|err| err.to_string())?;
        Ok(summary)
    }

    pub fn delete_note_forever(&self, id: &str) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        inner.notes.retain(|note| note.id != id);
        let transaction = self.db.begin_write().map_err(|err| err.to_string())?;
        remove_note_rows(&transaction, id)?;
        transaction.commit().map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn empty_trash(&self) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|err| err.to_string())?;
        let ids: Vec<String> = inner
            .notes
            .iter()
            .filter(|note| note.trashed_at.is_some())
            .map(|note| note.id.clone())
            .collect();
        if ids.is_empty() {
            return Ok(());
        }
        let transaction = self.db.begin_write().map_err(|err| err.to_string())?;
        for id in &ids {
            remove_note_rows(&transaction, id)?;
        }
        transaction.commit().map_err(|err| err.to_string())?;
        inner.notes.retain(|note| note.trashed_at.is_none());
        Ok(())
    }

    pub fn purge(&self) -> Result<usize, String> {
        self.purge_expired()
    }
}

fn load_summaries(db: &Database) -> Result<Vec<NoteSummary>, String> {
    let read = db.begin_read().map_err(|err| err.to_string())?;
    let table = read
        .open_table(NOTE_META)
        .map_err(|err| err.to_string())?;
    let mut notes = Vec::new();
    for entry in table.iter().map_err(|err| err.to_string())? {
        let (_, value) = entry.map_err(|err| err.to_string())?;
        let summary: NoteSummary =
            serde_json::from_slice(value.value()).map_err(|err| err.to_string())?;
        notes.push(summary);
    }
    Ok(notes)
}

fn migrate_legacy(db: &Database, dir: &Path) -> Result<Vec<NoteSummary>, String> {
    let path = dir.join("maybe-todo.json");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let bytes = std::fs::read(&path).map_err(|err| format!("读取旧数据失败：{err}"))?;
    if bytes.is_empty() {
        return Ok(Vec::new());
    }
    let legacy: LegacyStoreFile =
        serde_json::from_slice(&bytes).map_err(|err| format!("旧数据解析失败：{err}"))?;
    if legacy.notes.is_empty() {
        return Ok(Vec::new());
    }

    let transaction = db.begin_write().map_err(|err| err.to_string())?;
    let mut summaries = Vec::new();
    for note in legacy.notes {
        let summary = NoteSummary {
            id: note.id,
            note_type: note.note_type.clone(),
            title: note.title,
            summary: summarize(&note.note_type, &note.content),
            order: note.order,
            created_at: note.created_at,
            updated_at: note.updated_at,
            trashed_at: note.trashed_at,
            completed_at: note.completed_at,
            is_locked: note.is_locked,
        };
        write_meta(&transaction, &summary)?;
        write_content(&transaction, &summary.id, &note.content)?;
        summaries.push(summary);
    }
    transaction.commit().map_err(|err| err.to_string())?;

    let archived = dir.join("maybe-todo.json.migrated");
    let _ = std::fs::rename(&path, archived);
    Ok(summaries)
}

/* --------------------------------- commands -------------------------------- */

#[tauri::command]
pub fn list_summaries(
    store: State<'_, Store>,
    cursor: Option<String>,
    limit: usize,
) -> Result<NotePage, String> {
    store.list_page(cursor, limit)
}

#[tauri::command]
pub fn list_all_summaries(store: State<'_, Store>) -> Result<Vec<NoteSummary>, String> {
    store.list_all()
}

#[tauri::command]
pub fn list_trashed_summaries(
    store: State<'_, Store>,
    cursor: Option<String>,
    limit: usize,
) -> Result<NotePage, String> {
    store.list_trash_page(cursor, limit)
}

#[tauri::command]
pub fn get_note(store: State<'_, Store>, id: String) -> Result<Note, String> {
    store.get_note(&id)
}

#[tauri::command]
pub fn create_note(store: State<'_, Store>, input: CreateNoteInput) -> Result<Note, String> {
    store.create_note(input)
}

#[tauri::command]
pub fn update_note(store: State<'_, Store>, input: UpdateNoteInput) -> Result<Note, String> {
    store.update_note(input)
}

#[tauri::command]
pub fn set_lock(store: State<'_, Store>, id: String, locked: bool) -> Result<NoteSummary, String> {
    store.set_lock(&id, locked)
}

#[tauri::command]
pub fn reorder_notes(store: State<'_, Store>, ids: Vec<String>) -> Result<(), String> {
    store.reorder(ids)
}

#[tauri::command]
pub fn trash_note(store: State<'_, Store>, id: String) -> Result<(), String> {
    store.trash_note(&id)
}

#[tauri::command]
pub fn restore_note(store: State<'_, Store>, id: String) -> Result<NoteSummary, String> {
    store.restore_note(&id)
}

#[tauri::command]
pub fn delete_note_forever(store: State<'_, Store>, id: String) -> Result<(), String> {
    store.delete_note_forever(&id)
}

#[tauri::command]
pub fn empty_trash(store: State<'_, Store>) -> Result<(), String> {
    store.empty_trash()
}

#[tauri::command]
pub fn purge_trash(store: State<'_, Store>) -> Result<usize, String> {
    store.purge()
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

    fn input(id: &str, title: &str, text: &str) -> CreateNoteInput {
        CreateNoteInput {
            id: id.to_string(),
            note_type: "text".to_string(),
            title: title.to_string(),
            content: json!({ "version": 1, "format": "plain", "text": text }),
        }
    }

    #[test]
    fn stores_summaries_and_pages() {
        let dir = temp_dir("pages");
        let store = Store::open_at(&dir).expect("open store");
        for index in 0..5 {
            store
                .create_note(input(
                    &format!("n-{index}"),
                    &format!("标题 {index}"),
                    "第一行\n第二行\n第三行",
                ))
                .expect("create");
        }

        let first = store.list_page(None, 2).expect("first page");
        assert_eq!(first.items.len(), 2);
        assert_eq!(first.items[0].id, "n-4");
        assert_eq!(first.items[0].summary, "第一行\n第二行\n第三行");
        assert!(first.has_more);
        assert_eq!(first.next_cursor.as_deref(), Some("n-3"));

        let second = store
            .list_page(first.next_cursor.clone(), 2)
            .expect("second page");
        assert_eq!(second.items[0].id, "n-2");
        assert!(second.has_more);

        let third = store
            .list_page(second.next_cursor.clone(), 2)
            .expect("third page");
        assert_eq!(third.items[0].id, "n-0");
        assert!(!third.has_more);
        assert!(third.next_cursor.is_none());

        drop(store);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn updates_summary_without_loading_full_list() {
        let dir = temp_dir("update");
        let store = Store::open_at(&dir).expect("open store");
        store
            .create_note(input("n-1", "标题", "一\n二\n三\n四\n五\n六"))
            .expect("create");

        let updated = store
            .update_note(UpdateNoteInput {
                id: "n-1".to_string(),
                title: "新标题".to_string(),
                content: json!({ "version": 1, "format": "plain", "text": "甲\n乙" }),
                completed_at: None,
            })
            .expect("update");
        assert_eq!(updated.title, "新标题");
        assert_eq!(updated.summary, "甲\n乙");

        let full = store.get_note("n-1").expect("get note");
        assert_eq!(full.summary, "甲\n乙");
        assert_eq!(
            full.content.get("text").and_then(Value::as_str),
            Some("甲\n乙")
        );

        drop(store);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn trashes_and_restores_single_note() {
        let dir = temp_dir("trash");
        let store = Store::open_at(&dir).expect("open store");
        store.create_note(input("n-1", "A", "")).expect("create");
        store.create_note(input("n-2", "B", "")).expect("create");

        store.trash_note("n-1").expect("trash");
        assert_eq!(store.list_page(None, 10).expect("active").items.len(), 1);
        assert_eq!(
            store
                .list_trash_page(None, 10)
                .expect("trash page")
                .items
                .len(),
            1
        );

        let restored = store.restore_note("n-1").expect("restore");
        assert_eq!(restored.id, "n-1");
        assert_eq!(store.list_page(None, 10).expect("active").items.len(), 2);

        store.delete_note_forever("n-2").expect("delete");
        assert_eq!(store.list_page(None, 10).expect("active").items.len(), 1);

        drop(store);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn summarizes_todo_items() {
        let dir = temp_dir("todo-summary");
        let store = Store::open_at(&dir).expect("open store");
        store
            .create_note(CreateNoteInput {
                id: "t-1".to_string(),
                note_type: "todo".to_string(),
                title: "清单".to_string(),
                content: json!({
                    "version": 1,
                    "format": "checklist",
                    "items": [
                        { "id": "1", "text": "一", "done": true, "doneAt": 1 },
                        { "id": "2", "text": "二", "done": false, "doneAt": null },
                        { "id": "3", "text": "三", "done": false, "doneAt": null },
                        { "id": "4", "text": "四", "done": false, "doneAt": null },
                        { "id": "5", "text": "五", "done": false, "doneAt": null },
                        { "id": "6", "text": "六", "done": false, "doneAt": null }
                    ]
                }),
            })
            .expect("create");
        let page = store.list_page(None, 10).expect("page");
        assert_eq!(page.items[0].summary, "✓ 一\n· 二\n· 三\n· 四\n· 五");

        drop(store);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn migrates_legacy_json_notes() {
        let dir = temp_dir("migration");
        let legacy = serde_json::json!({
            "version": 1,
            "notes": [{
                "id": "legacy-1",
                "type": "text",
                "title": "旧便签",
                "content": { "version": 1, "format": "plain", "text": "一\n二\n三\n四\n五\n六" },
                "order": 0.0,
                "createdAt": 1000,
                "updatedAt": 2000,
                "trashedAt": null,
                "completedAt": null,
                "isLocked": false
            }]
        });
        std::fs::write(
            dir.join("maybe-todo.json"),
            serde_json::to_vec(&legacy).expect("legacy json"),
        )
        .expect("write legacy");

        let store = Store::open_at(&dir).expect("open store");
        let page = store.list_page(None, 10).expect("page");
        assert_eq!(page.items.len(), 1);
        assert_eq!(page.items[0].title, "旧便签");
        assert_eq!(page.items[0].summary, "一\n二\n三\n四\n五");
        assert!(dir.join("maybe-todo.json.migrated").exists());
        assert_eq!(
            store.get_note("legacy-1").expect("get").summary,
            "一\n二\n三\n四\n五"
        );

        drop(store);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
