import { useEffect, useState } from "react";

import "./DuckFeed.css";

const DuckFeed = ({ className }) => {
  const [count, setCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [x, setX] = useState(Math.random() * 550);
  const [y, setY] = useState(Math.random() * 350);

  const [scores, setScores] = useState([]);

  const [coords, setCoords] = useState({
    left: x,
    top: y,
  });

  const moveFeed = () => {
    if (!gameOver && timer > 0) {
      setX(Math.random() * 550, []);
      setY(Math.random() * 350, []);
      setCoords(
        {
          top: y,
          left: x,
        },
        []
      );

      setCount(count + 1);
    }
  };

  // timer stuff

  const resetGame = () => {
    setTimer(5);
    setCount(0);
    setGameOver(false);
    startTimer();
    moveFeed();
  };

  // prevent interval overlapping when reset is clicked
  const startTimer = () => {
    let gameTimer = setInterval(() => {
      setTimer((timer) => {
        let updatedTime = timer;
        if (timer > 0) {
          updatedTime--;
        }
        else {
          setGameOver(true);
          clearInterval(gameTimer)
        }
        return updatedTime;
      });
    }, 1000);
  };



  const GameStats = () => {
    return (
      <div className="GameStats">
        <h3>Current Score: {count}</h3>
        <h3>Timer: {timer} </h3>
        <button onClick={resetGame}>Restart</button>
      </div>
    );
  };

  // redo this
  const HighScore = () => {
    return (
      <div className="HighScore">
        <h2>High Scores:</h2>
        <ul className="scores">
          {scores && scores.map((record, idx) =>
            <li key={`high-score-${idx}`}>
              <div>
                {idx + 1}
              </div>
              <div>
                {record}
              </div>
            </li>
          )}
        </ul>
      </div>
    );
  };

  // convert scores to be list of objects with initials and score
  useEffect(() => {
    if (gameOver) {
      alert("Game Over");
      if (gameOver && scores.length < 3) {
        let oldScores = [...scores];
        oldScores.push(count);
        oldScores.sort((a, b) => (b - a));

        setScores(oldScores);
      }

      else {
        for (let i = 0; i < scores.length; i++) {
          if (count > scores[i].score) {
            let oldScores = [...scores];
            oldScores.pop(i)
            oldScores[i] = count;
            oldScores = oldScores.sort((a, b) => (b - a));
            setScores(oldScores);
          }
          else {
            console.log('score not high enough');
          }
        }
      }

      // change this to something else to prompt game over screen. maybe modal?
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver])

  return (
    <div>
      <h1>Feed the Duck!</h1>
      <HighScore />
      <GameStats />
      <div className={`${className || ""} DuckFeed`}>
        <div
          className="cereal shake"
          style={coords}
          onMouseOver={() => moveFeed()}
        />
      </div>
    </div>
  );
};

export default DuckFeed;
