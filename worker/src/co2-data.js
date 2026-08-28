// Indicatieve CO2e-uitstoot per kg product, gebaseerd op gemiddelde wereldwijde
// cijfers uit Poore & Nemecek (2018), zoals gepubliceerd via Our World in Data
// (ourworldindata.org/environmental-impacts-of-food). Bedoeld als vergelijking,
// niet als exacte levenscyclusanalyse.
export const CO2_FACTORS = {
  beef: 60,
  lamb_mutton: 24,
  cheese: 21,
  pork: 7,
  poultry: 6,
  fish_farmed: 5,
  eggs: 4.5,
  rice: 4,
  butter: 12,
  cream: 8,
  milk: 3,
  yogurt: 2.5,
  sugar: 3,
  vegetable_oil: 3.5,
  wheat_bread: 1.4,
  pasta: 1.4,
  tomatoes: 1.4,
  oats: 1.6,
  legumes_pulses: 1,
  potatoes: 0.5,
  root_vegetables: 0.4,
  leafy_vegetables: 0.5,
  other_vegetables: 0.7,
  nuts: 0.3,
  tofu: 3,
  tempeh: 2,
  seitan: 2.5,
  plant_milk: 0.9,
  vegan_cheese: 3,
  herbs_spices: 1,
  other: 1.5,
};

// Gemiddelde CO2-uitstoot van een personenauto, voor een tastbare vergelijking.
export const CAR_KG_CO2_PER_KM = 0.15;

export function co2ForIngredient(ingredient) {
  const grams = typeof ingredient.grams === "number" && ingredient.grams > 0 ? ingredient.grams : 0;
  const factor = CO2_FACTORS[ingredient.co2Category] ?? CO2_FACTORS.other;
  return (grams / 1000) * factor;
}

export function computeCo2(original, vegan) {
  const originalKg = original.reduce((sum, item) => sum + co2ForIngredient(item), 0);
  const veganKg = vegan.reduce((sum, item) => sum + co2ForIngredient(item), 0);
  const savingsKg = Math.max(0, originalKg - veganKg);

  return {
    originalKg: Math.round(originalKg * 10) / 10,
    veganKg: Math.round(veganKg * 10) / 10,
    savingsKg: Math.round(savingsKg * 10) / 10,
    savingsKm: Math.round(savingsKg / CAR_KG_CO2_PER_KM),
  };
}
