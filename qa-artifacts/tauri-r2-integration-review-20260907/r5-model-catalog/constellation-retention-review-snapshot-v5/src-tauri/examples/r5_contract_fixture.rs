use rivune_desktop::host::{
    AdmittedModelSelection, CatalogDefaults, CatalogProvider, ModelCatalog, ModelSelection,
    RichDraftMutationReceipt, RuntimeCapabilities, TeamSelection,
};
use serde_json::json;

fn main() {
    let lead = ModelSelection {
        schema_version: 1,
        provider_id: "codex:local".into(),
        model_id: None,
        effort_id: None,
        catalog_revision: "catalog-fixture-r1".into(),
    };
    let teammate = ModelSelection {
        schema_version: 1,
        provider_id: "claude:local".into(),
        model_id: None,
        effort_id: None,
        catalog_revision: "catalog-fixture-r1".into(),
    };
    let team = TeamSelection {
        schema_version: 1,
        lead_index: 0,
        members: vec![lead.clone(), teammate],
    };
    let catalog = ModelCatalog {
        schema_version: 1,
        revision: "catalog-fixture-r1".into(),
        providers: vec![
            CatalogProvider {
                id: "codex:local".into(),
                label: "Codex CLI".into(),
                transport: "cli".into(),
                adapter_state: "supported".into(),
                installation: "installed".into(),
                authentication: "unknown".into(),
                response_test: "notTested".into(),
                catalog_state: "unknown".into(),
                models: Vec::new(),
                defaults: CatalogDefaults {
                    model_id: None,
                    effort_id: None,
                },
                supports_provider_default: true,
                error_code: None,
            },
            CatalogProvider {
                id: "claude:local".into(),
                label: "Claude CLI".into(),
                transport: "cli".into(),
                adapter_state: "supported".into(),
                installation: "installed".into(),
                authentication: "unknown".into(),
                response_test: "notTested".into(),
                catalog_state: "unknown".into(),
                models: Vec::new(),
                defaults: CatalogDefaults {
                    model_id: None,
                    effort_id: None,
                },
                supports_provider_default: true,
                error_code: None,
            },
        ],
    };
    let admitted = AdmittedModelSelection {
        requested: lead.clone(),
        effective_model_id: None,
        effective_effort_id: None,
        resolution: "providerManagedDefault".into(),
        adapter_revision: "catalog-fixture-r1".into(),
    };
    let receipt = RichDraftMutationReceipt {
        state: "durable".into(),
        mutation_id: "mutation-fixture-1".into(),
        conversation_id: Some("conversation-fixture-1".into()),
        revision: Some(1),
        attachment_ids: Vec::new(),
        selection: Some(lead),
        team: Some(team),
        error: None,
    };
    let capabilities = RuntimeCapabilities {
        schema_version: 1,
        constellation: "available".into(),
        minimum_members: 2,
        reason_code: None,
    };
    println!(
        "{}",
        serde_json::to_string_pretty(&json!({
            "runtimeCapabilities": capabilities,
            "catalog": catalog,
            "admittedModelSelection": admitted,
            "richDraftReceipt": receipt
        }))
        .expect("R5 fixture must serialize")
    );
}
