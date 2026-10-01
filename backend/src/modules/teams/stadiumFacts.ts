// Publicly documented stadium facts (capacity, year opened) that the source API
// doesn't expose. Keyed by the club's Russian name as the source spells it.
// Clubs not listed simply show the ground's name and city.
export const STADIUM_FACTS: Record<string, { capacity: number; opened: number }> = {
  Кайрат: { capacity: 23804, opened: 1958 },
  Астана: { capacity: 30244, opened: 2009 },
  "Астана М": { capacity: 30244, opened: 2009 },
  Женис: { capacity: 30244, opened: 2009 },
  Ордабасы: { capacity: 25000, opened: 1969 },
  Актобе: { capacity: 13500, opened: 1975 },
  Тараз: { capacity: 12525, opened: 1936 },
  Иртыш: { capacity: 12000, opened: 1947 },
  Кайсар: { capacity: 11000, opened: 2025 },
  Каспий: { capacity: 11000, opened: 2025 },
  Кызылжар: { capacity: 11000, opened: 1967 },
  Атырау: { capacity: 7000, opened: 2020 },
  Туран: { capacity: 7000, opened: 2020 },
  Елимай: { capacity: 8000, opened: 1966 },
  Жайык: { capacity: 8320, opened: 1927 },
  Тобыл: { capacity: 8323, opened: 1964 },
  Алтай: { capacity: 8500, opened: 1963 },
  Батыр: { capacity: 6300, opened: 1970 },
  Жетысу: { capacity: 5500, opened: 1982 },
  Окжетпес: { capacity: 4158, opened: 1955 },
  Улытау: { capacity: 6000, opened: 1965 },
};
