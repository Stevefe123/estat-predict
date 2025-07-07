// This is your Admin Panel.
// Paste this entire block into your data/predictions.ts file.

export const dailyPredictions = {
  "2025-07-08": [ // Predictions for July 8th, 2025
    {
      // --- CATEGORY B PREDICTION ---
      id: '20250708-B1',
      league: "Primera Nacional (Argentina)",
      time: "20:10 UTC", // Kick-off time
      homeTeam: "Gimnasia Jujuy",
      awayTeam: "San Martin Tucuman",
      prediction: {
        type: "LOW_SCORE_WEAKER_TEAM",
        weakerTeam: "Gimnasia Jujuy",
      },
    },
    {
      // --- CATEGORY A PREDICTION ---
      id: '20250708-A1',
      league: "Veikkausliiga (Finland)",
      time: "16:00 UTC", // Kick-off time
      homeTeam: "HJK",
      awayTeam: "Haka",
      prediction: {
        type: "FORM_FAVORITE",
        strongerTeam: "HJK",
      },
    },
  ],
  // You can add predictions for other dates below this line
  // "2025-07-09": [ ... ],
};