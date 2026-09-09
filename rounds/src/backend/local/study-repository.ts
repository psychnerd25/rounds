import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyState, parseState, type StudyState } from "../../state/progress";
import type { UserProgressRepository } from "../../services/contracts";

const KEY = "rounds.study.v1";

export type StudyRepository = UserProgressRepository;

export const localStudyRepository: StudyRepository = {
  async load() {
    const raw = await AsyncStorage.getItem(KEY);
    return parseState(raw);
  },
  async save(state) {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  },
};

export { emptyState };
