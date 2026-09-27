# Brew math: converting coffee between machines

The core of the translator: the same drink on Nespresso Vertuo, Cometeer and
instant. Code: `lib/translator/brew-math.ts`. Tests: `npm run test:brew-math`.

## Rules (agreed with the test kitchen)

1. **Flavor first, match by dose.** Recipes are written in shots, pods,
   capsules and scoops, not volume. One common unit, the **double**:

   | 1 double = | |
   |---|---|
   | Nespresso Vertuo | 1 Double Espresso pod (80 ml) |
   | Cometeer | 1 capsule (~0.9 oz concentrate) |
   | Instant espresso | 2 rounded tsp |
   | Espresso | 2 shots |
   | Nespresso Original | 2 pods (one pod is a single shot) |
   | Brewed coffee / cold brew | ~8 oz (240 ml) |

   Doses are linear: 2 doubles = 2 capsules = 4 tsp.

2. **No water to match volume in espresso drinks.** In a milk drink the milk
   does the work. **Brewed-coffee sources** (Vertuo Mug, drip, cold brew) are
   the exception: there the coffee *is* the drink's volume, so Cometeer and
   instant get water to match.

3. **Whole units.** Nespresso: whole pods; a half double becomes one Espresso
   (40 ml) pod. Cometeer: whole capsules only (round to nearest, half rounds
   up, minimum 1), with a note when that changes the strength. Instant: 1/2 tsp.

4. **Cometeer is melted** (about 5 minutes submerged in hot water, or
   overnight in the fridge) for everything except plain hot coffee, where the
   frozen puck goes into 6–8 oz hot water (Cometeer's own instructions).
   Cometeer's hot latte adds **no water**: melted concentrate + steamed milk.

5. **Caffeine is reported, never used to shrink a dose.** Two capsules are
   360 mg and the nutrition panel says so. Cometeer Half Caff (~90 mg) and
   Decaf capsules are suggested for less caffeine, same flavor.

## Reference numbers

| | Volume | Caffeine | Source |
|---|---|---|---|
| Cometeer capsule | ~0.9 oz (27 ml) | 180 mg (Half Caff ~90, Decaf ~9) | Cometeer help center; volume measured by Tony |
| Vertuo Double Espresso | 80 ml | 135 mg (Chiaro), 150 mg (Scuro) | Published caffeine charts |
| Instant espresso (Medaglia d'Oro) | – | ~60–70 mg per rounded tsp | Published estimates |

These are starting points. When a test-kitchen tasting says a conversion is
off for a drink, adjust that recipe; if it's off everywhere, adjust the
constants in `brew-math.ts` and note why here.
