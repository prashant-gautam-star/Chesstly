import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

import SetupPosition from "./SetupPosition";
import Analysis from "./Analysis";
import GameHistory from "./GameHistory";


// =========================================================
// MAIN APP CONTENT
// =========================================================

function ChessApp() {

  const navigate = useNavigate();

  const [game, setGame] =
    useState(new Chess());

  const [screen, setScreen] =
    useState("home");

  const [botRating, setBotRating] =
    useState(null);

  const [playerColor, setPlayerColor] =
    useState("w");

  const [moves, setMoves] =
    useState([]);

  const [positions, setPositions] =
    useState([]);

  const [gameStatus, setGameStatus] =
    useState("");

  const [playerMoves, setPlayerMoves] =
    useState(0);


  // =======================================================
  // SAVE GAME TO HISTORY
  // =======================================================

  function saveGameToHistory({
    finalGame,
    finalMoves,
    finalPositions,
    result,
  }) {

    try {

      const savedGame = {
        id:
          Date.now().toString() +
          "-" +
          Math.random()
            .toString(36)
            .substring(2, 8),

        date:
          new Date().toISOString(),

        source: "bot",

        result,

        botRating,

        playerColor,

        moves: finalMoves,

        positions: finalPositions,

        fen: finalGame.fen(),

        pgn: finalGame.pgn(),
      };


      const existing =
        JSON.parse(
          localStorage.getItem(
            "chesstly_game_history"
          ) || "[]"
        );


      const updated = [
        savedGame,
        ...(
          Array.isArray(existing)
            ? existing
            : []
        ),
      ];


      localStorage.setItem(
        "chesstly_game_history",
        JSON.stringify(updated)
      );


    } catch (error) {

      console.error(
        "Could not save game to history:",
        error
      );

    }
  }


  // =======================================================
  // HOME
  // =======================================================

  function openPlayBot() {
    setScreen("bot-rating");
  }


  function openAnalysisBoard() {
    navigate("/analysis-menu");
  }


  // =======================================================
  // BOT SELECTION
  // =======================================================

  function chooseBot(rating) {

    setBotRating(rating);

    setScreen("color");
  }


  // =======================================================
  // BOT PROFILE
  // =======================================================

  function getBotProfile(rating) {
    const profiles = {
      300: { name: "Rookie", emoji: "♟" },
      800: { name: "Beginner", emoji: "♙" },
      1200: { name: "Intermediate", emoji: "♞" },
      1600: { name: "Advanced", emoji: "♝" },
      2000: { name: "Expert", emoji: "♜" },
      2400: { name: "Master", emoji: "♚" },
      2800: { name: "Grandmaster", emoji: "♛" },
      3000: { name: "Grandmaster", emoji: "♛" },
    };

    return profiles[rating] || {
      name: `Bot ${rating}`,
      emoji: "♟",
    };
  }


  // =======================================================
  // START GAME
  // =======================================================

  function startGame(color) {

    const newGame =
      new Chess();

    setGame(newGame);

    setPlayerColor(color);

    setMoves([]);

    setPositions([]);

    setGameStatus("");

    setPlayerMoves(0);

    setScreen("game");


    // If player chooses Black,
    // bot makes the first move.

    if (color === "b") {
      makeBotMove(
        newGame,
        botRating
      );
    }
  }


  // =======================================================
  // BOT MOVE
  // =======================================================

  async function makeBotMove(
    currentGame,
    rating,
    moveHistory = moves,
    positionHistory = positions
  ) {

    try {

      const response =
        await fetch(
          "https://chesstly.onrender.com/api/bot-move",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              fen:
                currentGame.fen(),

              rating:
                rating,
            }),
          }
        );


      const data =
        await response.json();


      const botGame =
        new Chess(
          currentGame.fen()
        );


      const botMove =
        botGame.move({
          from:
            data.move.substring(
              0,
              2
            ),

          to:
            data.move.substring(
              2,
              4
            ),

          promotion:
            "q",
        });


      setGame(botGame);


      const updatedMoves = [
        ...moveHistory,
        botMove.san,
      ];


      const updatedPositions = [
        ...positionHistory,

        {
          move:
            botMove.san,

          fen:
            botGame.fen(),

          color:
            "b",
        },
      ];


      setMoves(
        updatedMoves
      );


      setPositions(
        updatedPositions
      );


      if (
        botGame.isGameOver()
      ) {

        const result =
          getGameStatus(
            botGame
          );


        setGameStatus(
          result
        );


        saveGameToHistory({
          finalGame:
            botGame,

          finalMoves:
            updatedMoves,

          finalPositions:
            updatedPositions,

          result,
        });
      }

    } catch (error) {

      console.error(
        "Bot move error:",
        error
      );
    }
  }


  // =======================================================
  // PLAYER MOVE
  // =======================================================

  async function movePiece({
    sourceSquare,
    targetSquare,
  }) {

    if (
      screen !== "game" ||
      game.isGameOver() ||
      gameStatus
    ) {

      return false;
    }


    // Only allow player to move
    // on their own turn.

    if (
      game.turn() !==
      playerColor
    ) {

      return false;
    }


    const copy =
      new Chess(
        game.fen()
      );


    try {

      const playerMove =
        copy.move({
          from:
            sourceSquare,

          to:
            targetSquare,

          promotion:
            "q",
        });


      // Count actual player moves.

      setPlayerMoves(
        (previous) =>
          previous + 1
      );


      setGame(copy);


      const updatedMoves = [
        ...moves,
        playerMove.san,
      ];


      const updatedPositions = [
        ...positions,

        {
          move:
            playerMove.san,

          fen:
            copy.fen(),

          color:
            playerColor,
        },
      ];


      setMoves(
        updatedMoves
      );


      setPositions(
        updatedPositions
      );


      // Player's move ended game.

      if (
        copy.isGameOver()
      ) {

        const result =
          getGameStatus(copy);


        setGameStatus(
          result
        );


        saveGameToHistory({
          finalGame:
            copy,

          finalMoves:
            updatedMoves,

          finalPositions:
            updatedPositions,

          result,
        });


        return true;
      }


      // Bot's turn.

      await makeBotMove(
        copy,
        botRating,
        updatedMoves,
        updatedPositions
      );


      return true;

    } catch {

      return false;
    }
  }


  // =======================================================
  // GAME STATUS
  // =======================================================

  function getGameStatus(
    position
  ) {

    if (
      position.isCheckmate()
    ) {

      return position.turn() === "w"
        ? "Black Won"
        : "White Won";
    }


    if (
      position.isStalemate()
    ) {

      return "Game Drawn";
    }


    if (
      position.isThreefoldRepetition()
    ) {

      return "Game Drawn";
    }


    if (
      position.isInsufficientMaterial()
    ) {

      return "Game Drawn";
    }


    if (
      position.isDraw()
    ) {

      return "Game Drawn";
    }


    return "";
  }


  // =======================================================
  // RESIGN
  // =======================================================

  function resignGame() {

    if (
      screen !== "game" ||
      gameStatus
    ) {

      return;
    }


    // No completed player move
    // = Game Aborted.

    const result =
      playerMoves === 0
        ? "Game Aborted"
        : "Game Resigned";


    setGameStatus(
      result
    );


    saveGameToHistory({
      finalGame:
        game,

      finalMoves:
        moves,

      finalPositions:
        positions,

      result,
    });
  }


  // =======================================================
  // NEW GAME
  // =======================================================

  function playAgain() {

    const newGame =
      new Chess();


    setGame(newGame);

    setMoves([]);

    setPositions([]);

    setGameStatus("");

    setPlayerMoves(0);

    setScreen("game");


    if (
      playerColor === "b"
    ) {

      makeBotMove(
        newGame,
        botRating
      );
    }
  }


  // =======================================================
  // HOME
  // =======================================================

  function goHome() {

    setScreen("home");

    setGame(
      new Chess()
    );

    setBotRating(null);

    setMoves([]);

    setPositions([]);

    setGameStatus("");

    setPlayerMoves(0);

    navigate("/");
  }


  // =======================================================
  // HOME SCREEN
  // =======================================================

if (screen === "home") {
  return (
    <div className="home-page">

      {/* ================= NAVBAR ================= */}
      <nav className="home-navbar">

        <div
          className="home-logo"
          onClick={goHome}
          title="Go to Home"
        >
          ♞ <span>CHESSTLY</span>
        </div>

        <div className="home-nav-links">

          <button className="home-nav-active">
            HOME
          </button>

          <button
            className="home-nav-button"
            onClick={openAnalysisBoard}
          >
            ANALYSIS BOARD ♔
          </button>

          <button
            className="home-nav-button"
            onClick={openPlayBot}
          >
            PLAY BOT ♞
          </button>

          {/* Non-functional */}
          <button className="home-nav-button">
            TRAINING ♞
          </button>

          <button className="home-nav-button">
            COMMUNITY ♟
          </button>

          <button className="home-nav-button">
            NEWS
          </button>

          <button className="home-nav-button">
            SIGN IN
          </button>

          <button className="join-free-button">
            JOIN FREE
          </button>

        </div>
      </nav>


      {/* ================= HERO ================= */}
      <section className="home-hero">

        <div className="hero-chess-pieces">
          ♛ ♚
        </div>

        <div className="hero-content">

          <h1>
            Chesstly · Elevate Your Game.
          </h1>

          <p>
            The Ultimate Destination for Aspiring Grandmasters
            and Casual Players.
          </p>

          <button
            className="hero-start-button"
            onClick={openPlayBot}
          >
            GET STARTED NOW ♟
          </button>

        </div>

        <div className="hero-board-decoration">
          {Array.from({ length: 32 }).map((_, index) => (
            <div
              key={index}
              className={
                index % 2 === 0
                  ? "board-square light-square"
                  : "board-square dark-square"
              }
            />
          ))}
        </div>

      </section>


      {/* ================= FEATURES ================= */}
      <section className="home-features">

        {/* ANALYSIS */}
        <div className="feature-card">

<div className="feature-image">
  <img
    src="/images/analysis-board.png"
    alt="Analysis Board"
  />
</div>

          <h2>
            Analysis Board ♔
          </h2>

          <p>
            Explore any game, review strategies,
            and analyze your moves with powerful
            engine evaluation.
          </p>

          <button
            className="feature-button"
            onClick={openAnalysisBoard}
          >
            EXPLORE BOARD
          </button>

        </div>


        {/* PLAY BOT */}
       {/* PLAY BOT */}
<div className="feature-card">

  <div className="feature-image">
    <img
      src="/images/play-bot.jpg"
      alt="Play Bot"
    />
  </div>

  <h2>
    Play Bot ♞
  </h2>

  <p>
    Challenge custom AI opponents of
    different skill levels and improve
    your chess.
  </p>

  <button
    className="feature-button"
    onClick={openPlayBot}
  >
    START GAME
  </button>

</div>


        {/* TRAINING — NON FUNCTIONAL */}
        <div className="feature-card">

          <div className="feature-image training-image">
            ♜
          </div>

          <h2>
            Training ♞
          </h2>

          <p>
            Solve puzzles, learn tactics, study
            openings, and improve your game.
          </p>

          <button className="feature-button">
            START TRAINING
          </button>

        </div>

      </section>


      {/* ================= RECENT UPDATES ================= */}
      <section className="recent-updates">

        <h2>
          Recent Updates
        </h2>

        <div className="updates-grid">

          <div className="update-card">

            <div className="update-icon">
              ♟
            </div>

            <div>
              <h3>
                Deep Game Analysis
              </h3>

              <p>
                Review your games and discover
                mistakes, inaccuracies and strong moves.
              </p>
            </div>

          </div>


          <div className="update-card">

            <div className="update-icon">
              ♛
            </div>

            <div>
              <h3>
                Challenge the AI
              </h3>

              <p>
                Play against Chesstly's AI opponents
                across multiple difficulty levels.
              </p>
            </div>

          </div>

        </div>

      </section>

    </div>
  );
}


  // =======================================================
  // BOT RATING SCREEN
  // =======================================================

  if (screen === "bot-rating") {
    const ratings = [
      300,
      800,
      1200,
      1600,
      2000,
      2400,
      2800,
      3000,
    ];

    return (
      <div style={styles.selectionScreen}>
        <h1>Choose Your Opponent</h1>

        <div style={styles.ratingGrid}>
          {ratings.map((rating) => {
            const profile = getBotProfile(rating);

            return (
              <button
                key={rating}
                style={styles.ratingButton}
                onClick={() => chooseBot(rating)}
              >
                <span style={styles.ratingEmoji}>
                  {profile.emoji}
                </span>
                <span style={styles.ratingName}>
                  {profile.name}
                </span>
                <span style={styles.ratingNumber}>
                  {rating}
                </span>
              </button>
            );
          })}
        </div>

        <button
          style={styles.backButton}
          onClick={goHome}
        >
          Back
        </button>
      </div>
    );
  }


  // =======================================================
  // COLOR SCREEN
  // =======================================================

  if (
    screen === "color"
  ) {

    return (

      <div
        style={
          styles.selectionScreen
        }
      >

        <h1>
          Choose Your Side
        </h1>


        <div style={styles.selectedBotCard}>
          <span style={styles.selectedBotEmoji}>
            {getBotProfile(botRating).emoji}
          </span>
          <div>
            <div style={styles.selectedBotName}>
              {getBotProfile(botRating).name}
            </div>
            <div style={styles.selectedBotRating}>
              Rating {botRating}
            </div>
          </div>
        </div>


        <button
          style={
            styles.mainButton
          }
          onClick={() =>
            startGame("w")
          }
        >
          ♔ Play White
        </button>


        <button
          style={
            styles.mainButton
          }
          onClick={() =>
            startGame("b")
          }
        >
          ♚ Play Black
        </button>


        <button
          style={
            styles.backButton
          }
          onClick={() =>
            setScreen(
              "bot-rating"
            )
          }
        >
          Back
        </button>

      </div>
    );
  }


  // =======================================================
  // GAME SCREEN
  // =======================================================

  return (

    <div
      style={
        styles.gameScreen
      }
    >

      {/* TOP BAR */}

      <div
        style={
          styles.topBar
        }
      >

        <h1
          style={{
            ...styles.gameLogo,
            cursor: "pointer",
            userSelect: "none",
          }}
          onClick={goHome}
          title="Go to Home"
        >
          Chesstly
        </h1>


        <div
          style={
            styles.botInfo
          }
        >
          <span style={styles.botInfoEmoji}>
            {getBotProfile(botRating).emoji}
          </span>
          <span>
            {getBotProfile(botRating).name}
          </span>
        </div>

      </div>


      {/* GAME AREA */}

      <div
        style={
          styles.gameArea
        }
      >

        {/* BOARD */}

        <div
          style={
            styles.boardArea
          }
        >

          <div
            style={
              styles.playerLabel
            }
          >
            <div style={styles.playerName}>
              {playerColor === "w"
                ? `${getBotProfile(botRating).emoji} ${getBotProfile(botRating).name}`
                : "You"}
            </div>
            <div style={styles.playerColor}>
              {playerColor === "w"
                ? "Black"
                : "Black"}
            </div>
          </div>


          <Chessboard
            options={{
              position:
                game.fen(),

              onPieceDrop:
                movePiece,

              boardOrientation:
                playerColor === "w"
                  ? "white"
                  : "black",

              boardWidth: 560,
            }}
          />


          <div
            style={
              styles.playerLabel
            }
          >
            <div style={styles.playerName}>
              {playerColor === "w"
                ? "You"
                : `${getBotProfile(botRating).emoji} ${getBotProfile(botRating).name}`}
            </div>
            <div style={styles.playerColor}>
              {playerColor === "w"
                ? "White"
                : "White"}
            </div>
          </div>

        </div>


        {/* RIGHT GAME PANEL */}

        <div
          style={
            styles.gamePanel
          }
        >

          <div
            style={
              styles.panelHeader
            }
          >

            <h2>
              Game
            </h2>

            <span style={styles.panelBotName}>
              {getBotProfile(botRating).emoji}{" "}
              {getBotProfile(botRating).name}
            </span>

          </div>


          <div
            style={
              styles.moveHeader
            }
          >

            <span>
              White
            </span>

            <span>
              Black
            </span>

          </div>


          <div
            style={
              styles.moveList
            }
          >

            {Array.from({
              length:
                Math.ceil(
                  moves.length /
                  2
                ),
            }).map(
              (_, index) => {

                const whiteMove =
                  moves[
                    index * 2
                  ];

                const blackMove =
                  moves[
                    index * 2 + 1
                  ];


                return (

                  <div
                    key={index}
                    style={
                      styles.moveRow
                    }
                  >

                    <span
                      style={
                        styles.moveNumber
                      }
                    >
                      {index + 1}.
                    </span>


                    <span
                      style={
                        styles.move
                      }
                    >
                      {whiteMove ||
                        ""}
                    </span>


                    <span
                      style={
                        styles.move
                      }
                    >
                      {blackMove ||
                        ""}
                    </span>

                  </div>
                );
              }
            )}

          </div>


          {/* RESIGN BUTTON */}

          {!gameStatus && (

            <button
              style={
                styles.resignButton
              }
              onClick={
                resignGame
              }
            >
              Resign
            </button>

          )}

        </div>

      </div>


      {/* =================================================
          GAME RESULT MODAL
      ================================================= */}

      {gameStatus && (

        <div
          style={
            styles.modalOverlay
          }
        >

          <div
            style={
              styles.resultModal
            }
          >

            {/* CLOSE */}

            <button
              style={
                styles.closeButton
              }
              onClick={() =>
                setGameStatus("")
              }
            >
              ×
            </button>


            <h1
              style={
                styles.resultTitle
              }
            >
              {gameStatus}
            </h1>


            {/* ABORTED */}

            {gameStatus ===
              "Game Aborted" && (

              <button
                style={
                  styles.modalButton
                }
                onClick={
                  playAgain
                }
              >
                New Game
              </button>

            )}


            {/* RESIGNED */}

            {gameStatus ===
              "Game Resigned" && (

              <>

                <button
                  style={
                    styles.modalButton
                  }
                  onClick={
                    playAgain
                  }
                >
                  New Game
                </button>


                <button
                  style={
                    styles.modalButton
                  }
                  onClick={() =>
                    navigate(
                      "/analysis",
                      {
                        state: {
                          moves,
                          positions,
                          botRating,
                          playerColor,
                          gameStatus,
                        },
                      }
                    )
                  }
                >
                  Analyse
                </button>

              </>
            )}


            {/* CHECKMATE */}

            {(
              gameStatus ===
                "White Won" ||
              gameStatus ===
                "Black Won"
            ) && (

              <>

                <button
                  style={
                    styles.modalButton
                  }
                  onClick={
                    playAgain
                  }
                >
                  New Game
                </button>


                <button
                  style={
                    styles.modalButton
                  }
                  onClick={() =>
                    navigate(
                      "/analysis",
                      {
                        state: {
                          moves,
                          positions,
                          botRating,
                          playerColor,
                          gameStatus,
                        },
                      }
                    )
                  }
                >
                  Analyse
                </button>

              </>
            )}


            {/* DRAW */}

            {gameStatus ===
              "Game Drawn" && (

              <>

                <button
                  style={
                    styles.modalButton
                  }
                  onClick={
                    playAgain
                  }
                >
                  New Game
                </button>


                <button
                  style={
                    styles.modalButton
                  }
                  onClick={() =>
                    navigate(
                      "/analysis",
                      {
                        state: {
                          moves,
                          positions,
                          botRating,
                          playerColor,
                          gameStatus,
                        },
                      }
                    )
                  }
                >
                  Analyse
                </button>

              </>
            )}

          </div>

        </div>
      )}

    </div>
  );
}


// =========================================================
// ANALYSIS MENU
// =========================================================

function AnalysisMenu() {

  const navigate =
    useNavigate();


  return (

    <div
      style={
        styles.analysisMenu
      }
    >

      <h1
        style={
          styles.analysisTitle
        }
      >
        Analysis Board
      </h1>


      <p
        style={
          styles.analysisSubtitle
        }
      >
        Choose how you want to analyze
      </p>


      <div
        style={
          styles.analysisOptions
        }
      >

        {/* PASTE FEN / PGN */}

        <button
          style={
            styles.analysisOption
          }
          onClick={() =>
            navigate(
              "/analysis",
              {
                state: {
                  freshAnalysis:
                    true,
                },
              }
            )
          }
        >

          <div
            style={
              styles.analysisIcon
            }
          >
            ♟
          </div>


          <div
            style={
              styles.analysisOptionTitle
            }
          >
            Paste FEN / PGN
          </div>


          <div
            style={
              styles.analysisOptionText
            }
          >
            Analyze a position
            or complete game
          </div>

        </button>


        {/* SETUP POSITION */}

        <button
          style={
            styles.analysisOption
          }
          onClick={() =>
            navigate(
              "/setup-position"
            )
          }
        >

          <div
            style={
              styles.analysisIcon
            }
          >
            ⚙
          </div>


          <div
            style={
              styles.analysisOptionTitle
            }
          >
            Set Up Position
          </div>


          <div
            style={
              styles.analysisOptionText
            }
          >
            Create a position
            manually
          </div>

        </button>


        {/* GAME HISTORY */}

        <button
          style={
            styles.analysisOption
          }
          onClick={() =>
            navigate("/game-history")
          }
        >

          <div
            style={
              styles.analysisIcon
            }
          >
            🕘
          </div>


          <div
            style={
              styles.analysisOptionTitle
            }
          >
            Game History
          </div>


          <div
            style={
              styles.analysisOptionText
            }
          >
            Review your previous
            games
          </div>

        </button>

      </div>


      <button
        style={
          styles.analysisBackButton
        }
        onClick={() =>
          navigate("/")
        }
      >
        ← Back
      </button>

    </div>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = {

  // =======================================================
  // HOME
  // =======================================================

  home: {
    minHeight: "100vh",
    background: "#161512",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    fontSize: "64px",
    margin: "0",
    lineHeight: "1.1",
  },

  tagline: {
    color: "#aaa",
    fontSize: "20px",
    margin: "5px 0 40px",
  },

  mainButton: {
    width: "260px",
    padding: "15px",
    margin: "8px",
    borderRadius: "8px",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
  },


  // =======================================================
  // SELECTION
  // =======================================================

  selectionScreen: {
    minHeight: "100vh",
    background: "#161512",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  ratingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 120px)",
    gap: "15px",
    margin: "30px",
  },

  ratingButton: {
    minHeight: "135px",
    padding: "16px 12px",
    fontSize: "18px",
    cursor: "pointer",
    borderRadius: "10px",
    border: "1px solid #444",
    background: "#262522",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },

  ratingEmoji: {
    fontSize: "42px",
    lineHeight: 1,
  },

  ratingName: {
    fontSize: "17px",
    fontWeight: "700",
  },

  ratingNumber: {
    fontSize: "13px",
    color: "#888",
  },

  backButton: {
    padding: "12px 30px",
    marginTop: "15px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  },


  // =======================================================
  // ANALYSIS MENU
  // =======================================================

  analysisMenu: {
    minHeight: "100vh",
    background: "#161512",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    boxSizing: "border-box",
  },

  analysisTitle: {
    fontSize: "44px",
    margin: "0",
  },

  analysisSubtitle: {
    color: "#999",
    fontSize: "18px",
    margin: "10px 0 35px",
  },

  analysisOptions: {
    display: "flex",
    gap: "20px",
  },

  analysisOption: {
    width: "260px",
    minHeight: "230px",
    background: "#262522",
    color: "white",
    border: "1px solid #3a3936",
    borderRadius: "12px",
    cursor: "pointer",
    padding: "25px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },

  analysisIcon: {
    fontSize: "45px",
    marginBottom: "15px",
  },

  analysisOptionTitle: {
    fontSize: "21px",
    fontWeight: "bold",
    marginBottom: "8px",
  },

  analysisOptionText: {
    color: "#999",
    fontSize: "14px",
    textAlign: "center",
    lineHeight: "1.4",
  },

  analysisBackButton: {
    marginTop: "30px",
    padding: "12px 30px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
  },


  // =======================================================
  // GAME
  // =======================================================

  gameScreen: {
    minHeight: "100vh",
    background: "#161512",
    color: "white",
    padding: "20px 40px",
    position: "relative",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: "1200px",
    margin: "0 auto 25px",
  },

  gameLogo: {
    margin: 0,
  },

  botInfo: {
    color: "#ddd",
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "600",
  },

  botInfoEmoji: {
    fontSize: "28px",
  },

  selectedBotCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    margin: "0 0 24px",
    padding: "12px 18px",
    background: "#262522",
    borderRadius: "10px",
  },

  selectedBotEmoji: {
    fontSize: "38px",
  },

  selectedBotName: {
    fontSize: "18px",
    fontWeight: "700",
  },

  selectedBotRating: {
    color: "#888",
    fontSize: "13px",
    marginTop: "2px",
  },

  panelBotName: {
    color: "#aaa",
    fontSize: "15px",
  },

  gameArea: {
    display: "flex",
    gap: "25px",
    maxWidth: "1000px",
    margin: "0 auto",
    alignItems: "flex-start",
  },

  boardArea: {
    width: "560px",
    flexShrink: 0,
  },

  playerLabel: {
    padding: "7px 4px",
    fontSize: "18px",
    minHeight: "48px",
    boxSizing: "border-box",
  },

  playerName: {
    fontSize: "18px",
    fontWeight: "700",
  },

  playerColor: {
    color: "#888",
    fontSize: "14px",
    marginTop: "3px",
  },


  // =======================================================
  // GAME PANEL
  // =======================================================

  gamePanel: {
    width: "400px",
    minHeight: "650px",
    background: "#262522",
    borderRadius: "10px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  panelHeader: {
    padding: "20px",
    borderBottom: "1px solid #444",
    display: "flex",
    justifyContent: "space-between",
  },

  moveHeader: {
    padding: "15px 20px",
    display: "flex",
    justifyContent: "space-between",
    color: "#aaa",
    borderBottom: "1px solid #444",
  },

  moveList: {
    padding: "10px 15px",
    overflowY: "auto",
    flex: 1,
  },

  moveRow: {
    display: "grid",
    gridTemplateColumns:
      "40px 1fr 1fr",
    padding: "8px",
    fontSize: "17px",
  },

  moveNumber: {
    color: "#888",
  },

  move: {
    padding: "0 10px",
  },


  // =======================================================
  // RESIGN
  // =======================================================

  resignButton: {
    margin: "20px",
    padding: "14px",
    background: "#b33",
    color: "white",
    border: "none",
    borderRadius: "7px",
    fontSize: "16px",
    cursor: "pointer",
  },


  // =======================================================
  // RESULT MODAL
  // =======================================================

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background:
      "rgba(0, 0, 0, 0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  resultModal: {
    width: "420px",
    background: "#262522",
    borderRadius: "12px",
    padding: "45px 35px 35px",
    textAlign: "center",
    boxShadow:
      "0 10px 40px rgba(0, 0, 0, 0.5)",
    position: "relative",
  },

  resultTitle: {
    fontSize: "32px",
    marginBottom: "30px",
  },

  closeButton: {
    position: "absolute",
    top: "12px",
    right: "18px",
    background: "none",
    border: "none",
    color: "#aaa",
    fontSize: "30px",
    cursor: "pointer",
  },

  modalButton: {
    width: "280px",
    padding: "15px",
    margin: "8px auto",
    display: "block",
    borderRadius: "8px",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
  },
};


// =========================================================
// ROUTER
// =========================================================

function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* HOME + PLAY BOT */}

        <Route
          path="/"
          element={
            <ChessApp />
          }
        />


        {/* ANALYSIS MENU */}

        <Route
          path="/analysis-menu"
          element={
            <AnalysisMenu />
          }
        />


        {/* ACTUAL ANALYSIS PAGE */}

        <Route
          path="/analysis"
          element={
            <Analysis />
          }
        />


        {/* SETUP POSITION */}

        <Route
          path="/setup-position"
          element={
            <SetupPosition />
          }
        />


        {/* GAME HISTORY */}

        <Route
          path="/game-history"
          element={
            <GameHistory />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}


export default App; 