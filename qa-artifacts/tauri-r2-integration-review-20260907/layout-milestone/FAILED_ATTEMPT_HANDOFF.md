# Failed-attempt renderer correction

Exact runtime retry request freezes requestID,invocationID,failedAttemptID. Newattempt ID from host invalidates old pending state; missing either identifier hides retry and blocks new send until recovery/cancel. Unknown acknowledgement remains blocked, never silently replayed. Bridge tests5passed. Constellation UI fixture includes missing-attempt negative case in CONSTELLATION_UI_CHECKS.json.

Still provisional until independent host review accepts exact failed-attempt tuple semantics and checkpoint-write recovery. Runtime has not supplied a separate actionID; no field was invented. No native build/provider call.
