# Controls

All controls are rendered as custom UI elements (toolbar buttons / overlays) within tldraw.

## Buttons

| Control | Behavior |
|---|---|
| **Play** | Starts the tick loop; locks team assignment; disables zone toggle |
| **Pause** | Suspends the tick loop; units hold position and state |
| **Clear All** | Stops and resets simulation; removes all units; re-enables zone toggle |

## Team toggle

The **2-team / 4-team toggle** is only available before a battle starts or after Clear All. It is disabled while the simulation is running or paused mid-battle.

## Planned

- **Speed dial**: multiplier on the tick delta (0.25× to 4×), adjustable while the simulation is running
