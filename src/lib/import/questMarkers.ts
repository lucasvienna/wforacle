/** Best-effort map from a tracked quest id to the `challengeProgress` marker
 * challenge name(s) that indicate the quest is complete. A quest counts as done
 * when ANY of its markers is present. These are heuristic — the DE profile has
 * no explicit quest log — which is why import always previews before applying.
 * Keys must match dataset quest ids. */
export const QUEST_MARKERS: Record<string, string[]> = {
	theseconddream: ['SecondDreamTitleChallenge'],
	thewarwithin: ['TheWarWithin'],
	heartofdeimos: ['MummyQuestKillBroodMother'],
	angelsofthezariman: ['VMCompleteQuestVox'],
};
