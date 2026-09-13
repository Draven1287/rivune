use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager, Runtime,
};

pub const TRAY_ID: &str = "rivune-tray";
pub const OPEN_ID: &str = "rivune-open";
pub const REVIEW_ID: &str = "rivune-review";
pub const SETTINGS_ID: &str = "rivune-settings";
pub const QUIT_ID: &str = "rivune-quit";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TrayStatus {
    Starting,
    Idle,
    Running { active_runs: usize },
    NeedsAttention,
    Unavailable,
}

impl TrayStatus {
    fn label(self) -> String {
        match self {
            Self::Starting => "Status: Starting".into(),
            Self::Idle => "Status: Idle".into(),
            Self::Running { active_runs: 1 } => "Status: 1 run active".into(),
            Self::Running { active_runs } => format!("Status: {active_runs} runs active"),
            Self::NeedsAttention => "Status: Action required".into(),
            Self::Unavailable => "Status: Unavailable".into(),
        }
    }
}

pub struct TrayController<R: Runtime> {
    _tray: TrayIcon<R>,
    status_item: MenuItem<R>,
}

pub struct TrayActions<R: Runtime> {
    /// Restores or recreates the authoritative main window and focuses it.
    pub open_main: fn(&AppHandle<R>) -> tauri::Result<()>,
    /// Opens one explicit Review-entry surface in the authoritative renderer.
    pub open_review: fn(&AppHandle<R>) -> tauri::Result<()>,
    /// Restores the authoritative window and navigates to the real Settings surface.
    pub open_settings: fn(&AppHandle<R>) -> tauri::Result<()>,
    /// Enqueues one host-owned asynchronous graceful shutdown and returns promptly.
    /// Success means the request was accepted, not that cleanup or exit completed.
    pub request_quit: fn(&AppHandle<R>) -> tauri::Result<()>,
}

impl<R: Runtime> TrayController<R> {
    pub fn set_status(&self, status: TrayStatus) -> tauri::Result<()> {
        self.status_item.set_text(status.label())
    }
}

pub fn install<R: Runtime>(
    app: &AppHandle<R>,
    actions: TrayActions<R>,
) -> tauri::Result<TrayController<R>> {
    let status_item = MenuItem::with_id(
        app,
        "rivune-status",
        TrayStatus::Starting.label(),
        false,
        None::<&str>,
    )?;
    let open_item = MenuItem::with_id(app, OPEN_ID, "Open Rivune", true, None::<&str>)?;
    let review_item = MenuItem::with_id(app, REVIEW_ID, "Add text to Review…", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, SETTINGS_ID, "Settings…", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, QUIT_ID, "Quit Rivune", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &status_item,
            &open_item,
            &review_item,
            &settings_item,
            &separator,
            &quit_item,
        ],
    )?;

    let icon = app.default_window_icon().cloned().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Rivune tray requires the approved packaged application icon",
        )
    })?;

    let tray = TrayIconBuilder::with_id(TRAY_ID)
        // The packaged Rivune icon is the approved silver R / galaxy artwork.
        // Keep its color treatment in the menu bar instead of applying a template mask.
        .icon(icon)
        .icon_as_template(false)
        .tooltip("Rivune")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            OPEN_ID => mark_failure(app, (actions.open_main)(app)),
            REVIEW_ID => mark_failure(app, (actions.open_review)(app)),
            SETTINGS_ID => mark_failure(app, (actions.open_settings)(app)),
            QUIT_ID => mark_failure(app, (actions.request_quit)(app)),
            _ => {}
        })
        .build(app)?;

    Ok(TrayController {
        _tray: tray,
        status_item,
    })
}

pub fn set_status<R: Runtime>(app: &AppHandle<R>, status: TrayStatus) -> tauri::Result<()> {
    let controller = app.try_state::<TrayController<R>>().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Rivune tray has not been installed and managed",
        )
    })?;
    controller.set_status(status)
}

fn mark_failure<R: Runtime>(app: &AppHandle<R>, result: tauri::Result<()>) {
    if result.is_err() {
        if let Some(controller) = app.try_state::<TrayController<R>>() {
            let _ = controller.set_status(TrayStatus::NeedsAttention);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_labels_are_bounded_and_truthful() {
        assert_eq!(TrayStatus::Starting.label(), "Status: Starting");
        assert_eq!(TrayStatus::Idle.label(), "Status: Idle");
        assert_eq!(
            TrayStatus::Running { active_runs: 1 }.label(),
            "Status: 1 run active"
        );
        assert_eq!(
            TrayStatus::Running { active_runs: 3 }.label(),
            "Status: 3 runs active"
        );
        assert_eq!(
            TrayStatus::NeedsAttention.label(),
            "Status: Action required"
        );
        assert_eq!(TrayStatus::Unavailable.label(), "Status: Unavailable");
    }

    #[test]
    fn menu_and_settings_ids_are_stable_integration_hooks() {
        assert_eq!(TRAY_ID, "rivune-tray");
        assert_eq!(OPEN_ID, "rivune-open");
        assert_eq!(REVIEW_ID, "rivune-review");
        assert_eq!(SETTINGS_ID, "rivune-settings");
        assert_eq!(QUIT_ID, "rivune-quit");
    }
}
