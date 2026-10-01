import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  masterDataService,
  type CreateCategoryInput,
  type MasterDataCrudType,
} from '../services/masterData.service';

export function useMasterData<T>(type: MasterDataCrudType) {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'master-data', type];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  const rowsQuery = useQuery({
    queryKey,
    queryFn: () => masterDataService.list<T>(type),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      masterDataService.createCategory(input),
    onSuccess: invalidate,
  });

  return { rowsQuery, createMutation };
}
