import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TaskSortState {
  // Por projeto: true = tarefas concluídas agrupadas no fim da lista.
  groupDoneLastByProject: Record<string, boolean>
  toggleGroupDoneLast: (projectId: string) => void
}

export const useTaskSortStore = create<TaskSortState>()(
  persist(
    (set) => ({
      groupDoneLastByProject: {},
      toggleGroupDoneLast: (projectId) =>
        set((s) => ({
          groupDoneLastByProject: { ...s.groupDoneLastByProject, [projectId]: !s.groupDoneLastByProject[projectId] },
        })),
    }),
    { name: 'taskez-task-sort' },
  ),
)

export function useGroupDoneLast(projectId: string) {
  return useTaskSortStore((s) => Boolean(s.groupDoneLastByProject[projectId]))
}
