import * as React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Player, PlayerStats } from '../../types/nba';
import './InteractiveStatsComparison.css';

interface InteractiveStatsComparisonProps {
  player1: Player;
  player2: Player;
  seasonStats1: PlayerStats[];
  seasonStats2: PlayerStats[];
}

interface StatConfig {
  id: string;
  label: string;
  weight: number;
}

const InteractiveStatsComparison: React.FC<InteractiveStatsComparisonProps> = ({
  player1,
  player2,
  seasonStats1,
  seasonStats2
}) => {
  const [statConfigs, setStatConfigs] = React.useState<StatConfig[]>([
    { id: 'points', label: 'Points', weight: 1 },
    { id: 'assists', label: 'Assists', weight: 1 },
    { id: 'rebounds', label: 'Rebounds', weight: 1 }
  ]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(statConfigs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setStatConfigs(items);
  };

  const calculateScore = (stats: PlayerStats): number => {
    return statConfigs.reduce((score, config) => {
      return score + (stats[config.id as keyof PlayerStats] as number) * config.weight;
    }, 0);
  };

  return (
    <div className="interactive-stats">
      <div className="stats-configuration">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="stats">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="stat-list"
              >
                {statConfigs.map((stat, index) => (
                  <Draggable key={stat.id} draggableId={stat.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="stat-item"
                      >
                        <span>{stat.label}</span>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.5"
                          value={stat.weight}
                          onChange={(e) => {
                            const newConfigs = [...statConfigs];
                            newConfigs[index].weight = Number(e.target.value);
                            setStatConfigs(newConfigs);
                          }}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div className="comparison-results">
        <div className="player-score">
          <h3>{player1.fullName}</h3>
          <div className="score">{calculateScore(seasonStats1[0]).toFixed(1)}</div>
        </div>
        <div className="player-score">
          <h3>{player2.fullName}</h3>
          <div className="score">{calculateScore(seasonStats2[0]).toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveStatsComparison; 