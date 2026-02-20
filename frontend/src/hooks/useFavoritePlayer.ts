import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Player } from '../types/player';
import { addFavorite, removeFavorite } from '../services/favoriteService';

export function useFavoritePlayer() {
  const queryClient = useQueryClient();
  
  const addToFavorites = useMutation({
    mutationFn: (player: Player) => addFavorite(player),
    onMutate: async (player) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      
      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<Player[]>(['favorites']);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Player[]>(['favorites'], old => {
        return old ? [...old, player] : [player];
      });
      
      // Return a context object with the snapshot
      return { previousFavorites };
    },
    onError: (_err, _player, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['favorites'], context?.previousFavorites);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    }
  });
  
  const removeFromFavorites = useMutation({
    mutationFn: (playerId: number) => removeFavorite(playerId),
    onMutate: async (playerId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      
      const previousFavorites = queryClient.getQueryData<Player[]>(['favorites']);
      
      queryClient.setQueryData<Player[]>(['favorites'], old => {
        return old ? old.filter(player => player.id !== playerId) : [];
      });
      
      return { previousFavorites };
    },
    onError: (_err, _playerId, context) => {
      queryClient.setQueryData(['favorites'], context?.previousFavorites);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    }
  });
  
  return {
    addToFavorites,
    removeFromFavorites
  };
} 