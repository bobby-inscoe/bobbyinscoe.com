import type React from 'react';
import { useEffect, useState } from 'react';

import '@/features/duck-feed/components/duck-feed.css';

interface DuckFeedProps {
  className?: string;
}

export function DuckFeed({ className }: DuckFeedProps): React.JSX.Element {
  const [count, setCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [x, setX] = useState(Math.random() * 550);
  const [y, setY] = useState(Math.random() * 350);

  const [scores, setScores] = useState<number[]>([]);

  const [coords, setCoords] = useState({
    left: x,
    top: y,
  });

  const moveFeed = () => {
    if (!gameOver && timer > 0) {
      const nextX = Math.random() * 550;
      const nextY = Math.random() * 350;
      setX(nextX);
      setY(nextY);
      setCoords({
        top: nextY,
        left: nextX,
      });

      setCount(count + 1);
    }
  };

  const resetGame = () => {
    setTimer(5);
    setCount(0);
    setGameOver(false);
    startTimer();
    moveFeed();
  };

  const startTimer = () => {
    const gameTimer = setInterval(() => {
      setTimer((timer) => {
        let updatedTime = timer;
        if (timer > 0) {
          updatedTime--;
        } else {
          setGameOver(true);
          clearInterval(gameTimer);
        }
        return updatedTime;
      });
    }, 1000);
  };

  const GameStats = (): React.JSX.Element => {
    return (
      <div className="GameStats">
        <h3>Current Score: {count}</h3>
        <h3>Timer: {timer} </h3>
        <button type="button" onClick={resetGame}>
          Restart
        </button>
      </div>
    );
  };

  const HighScore = (): React.JSX.Element => {
    return (
      <div className="HighScore">
        <h2>High Scores:</h2>
        <ul className="scores">
          {scores.map((record, idx) => (
            <li key={record}>
              <div>{idx + 1}</div>
              <div>{record}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // The game-over transition must run once per round, not once per score update.
  // biome-ignore lint/correctness/useExhaustiveDependencies: score state is intentionally captured at game over.
  useEffect(() => {
    if (gameOver) {
      alert('Game Over');
      if (gameOver && scores.length < 3) {
        const oldScores = [...scores];
        oldScores.push(count);
        oldScores.sort((a, b) => b - a);

        setScores(oldScores);
      } else {
        for (let i = 0; i < scores.length; i++) {
          if (count > scores[i]) {
            let oldScores = [...scores];
            oldScores.splice(i, 1, count);
            oldScores = oldScores.sort((a, b) => b - a);
            setScores(oldScores);
          } else {
            console.log('score not high enough');
          }
        }
      }
    }
  }, [gameOver]);

  return (
    <div>
      <h1>Feed the Duck!</h1>
      <HighScore />
      <GameStats />
      <div className={`${className || ''} DuckFeed`}>
        <button
          type="button"
          aria-label="Feed the duck"
          className="cereal shake"
          style={coords}
          onMouseOver={() => moveFeed()}
          onFocus={() => moveFeed()}
        />
      </div>
    </div>
  );
}
