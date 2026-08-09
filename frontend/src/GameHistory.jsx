import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function GameHistory() {
  const navigate = useNavigate();

  const [games, setGames] = useState([]);

  // =========================================================
  // LOAD SAVED GAMES
  // =========================================================

  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        "chesstly_game_history"
      );

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setGames(parsed);
        }
      }
    } catch (error) {
      console.error(
        "Could not load game history:",
        error
      );
    }
  }, []);

  // =========================================================
  // OPEN GAME
  // =========================================================

  function openGame(game) {
    navigate("/analysis", {
      state: {
        savedGame: game,
        moves: game.moves || [],
        positions: game.positions || [],
        fen: game.fen || "",
        pgn: game.pgn || "",
        botRating: game.botRating || null,
        playerColor: game.playerColor || "w",
        gameStatus: game.result || "",
      },
    });
  }

  // =========================================================
  // DELETE ONE GAME
  // =========================================================

  function deleteGame(event, id) {
    event.stopPropagation();

    const confirmed = window.confirm(
      "Delete this game from history?"
    );

    if (!confirmed) {
      return;
    }

    const updated = games.filter(
      (game) => game.id !== id
    );

    setGames(updated);

    localStorage.setItem(
      "chesstly_game_history",
      JSON.stringify(updated)
    );
  }

  // =========================================================
  // CLEAR ALL
  // =========================================================

  function clearHistory() {
    if (games.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Delete all saved games?"
    );

    if (!confirmed) {
      return;
    }

    setGames([]);

    localStorage.removeItem(
      "chesstly_game_history"
    );
  }

  // =========================================================
  // DATE FORMAT
  // =========================================================

  function formatDate(date) {
    if (!date) {
      return "Unknown date";
    }

    try {
      return new Date(date).toLocaleString(
        undefined,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return String(date);
    }
  }

  // =========================================================
  // GAME TITLE
  // =========================================================

  function getTitle(game) {
    if (game.source === "bot") {
      return `vs Bot ${game.botRating || "?"}`;
    }

    if (game.source === "analysis") {
      return "Saved Analysis";
    }

    return "Saved Game";
  }

  // =========================================================
  // RESULT
  // =========================================================

  function getResult(game) {
    if (!game.result) {
      return "Analysis";
    }

    return game.result;
  }

  // =========================================================
  // RESULT STYLE
  // =========================================================

  function getResultStyle(result) {
    switch (result) {
      case "White Won":
        return styles.whiteResult;

      case "Black Won":
        return styles.blackResult;

      case "Game Drawn":
        return styles.drawResult;

      case "Game Resigned":
        return styles.resignedResult;

      case "Game Aborted":
        return styles.abortedResult;

      default:
        return styles.analysisResult;
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div style={styles.page}>

      {/* =================================================
          HEADER
      ================================================= */}

      <div style={styles.header}>

        <button
          style={styles.backButton}
          onClick={() => navigate("/analysis-menu")}
        >
          ←
        </button>

        <div>
          <h1 style={styles.title}>
            Game History
          </h1>

          <p style={styles.subtitle}>
            Your saved games and analyses
          </p>
        </div>

        {games.length > 0 && (
          <button
            style={styles.clearButton}
            onClick={clearHistory}
          >
            Clear History
          </button>
        )}

      </div>


      {/* =================================================
          CONTENT
      ================================================= */}

      <div style={styles.content}>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {games.length === 0 ? (
          <div style={styles.emptyState}>

            <div style={styles.emptyIcon}>
              ♟
            </div>

            <h2 style={styles.emptyHeading}>
              No saved games
            </h2>

            <p style={styles.emptyText}>
              Games you play against bots
              will appear here automatically.
            </p>

            <p style={styles.emptyText}>
              You can also save games from
              the Analysis Board.
            </p>

            <button
              style={styles.playButton}
              onClick={() => navigate("/")}
            >
              Go to Home
            </button>

          </div>
        ) : (

          /* =================================================
             GAME LIST
          ================================================= */

          <div style={styles.gameList}>

            {games.map((game, index) => {

              const result = getResult(game);

              return (
                <div
                  key={game.id || index}
                  style={styles.gameCard}
                  onClick={() => openGame(game)}
                >

                  {/* GAME ICON */}

                  <div style={styles.gameIcon}>
                    {game.source === "bot"
                      ? "♟"
                      : "⌕"}
                  </div>


                  {/* GAME INFORMATION */}

                  <div style={styles.gameInfo}>

                    <div style={styles.gameTitle}>
                      {getTitle(game)}
                    </div>

                    <div style={styles.gameDate}>
                      {formatDate(game.date)}
                    </div>

                    <div style={styles.gameDetails}>

                      {game.moves &&
                      game.moves.length > 0
                        ? `${Math.ceil(
                            game.moves.length / 2
                          )} moves`
                        : "Position analysis"}

                    </div>

                  </div>


                  {/* RESULT */}

                  <div
                    style={{
                      ...styles.result,
                      ...getResultStyle(result),
                    }}
                  >
                    {result}
                  </div>


                  {/* DELETE */}

                  <button
                    style={styles.deleteButton}
                    onClick={(event) =>
                      deleteGame(
                        event,
                        game.id
                      )
                    }
                    title="Delete game"
                  >
                    ×
                  </button>

                </div>
              );
            })}

          </div>
        )}

      </div>

    </div>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = {

  page: {
    minHeight: "100vh",
    background: "#161512",
    color: "#fff",
    padding: "35px 55px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },


  // =======================================================
  // HEADER
  // =======================================================

  header: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    paddingBottom: "30px",
    borderBottom: "1px solid #333",
  },

  backButton: {
    width: "48px",
    height: "48px",
    background: "#262522",
    color: "#bbb",
    border: "none",
    borderRadius: "8px",
    fontSize: "32px",
    cursor: "pointer",
  },

  title: {
    margin: 0,
    fontSize: "34px",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#888",
    fontSize: "15px",
  },

  clearButton: {
    marginLeft: "auto",
    background: "#333230",
    color: "#aaa",
    border: "none",
    borderRadius: "7px",
    padding: "11px 16px",
    cursor: "pointer",
    fontSize: "14px",
  },


  // =======================================================
  // CONTENT
  // =======================================================

  content: {
    maxWidth: "1100px",
    margin: "30px auto 0",
  },


  // =======================================================
  // EMPTY STATE
  // =======================================================

  emptyState: {
    minHeight: "450px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    background: "#262522",
    borderRadius: "12px",
    border: "1px solid #333",
  },

  emptyIcon: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "#333230",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "42px",
    color: "#777",
    marginBottom: "15px",
  },

  emptyHeading: {
    fontSize: "24px",
    margin: "5px 0 10px",
  },

  emptyText: {
    color: "#888",
    margin: "4px 0",
    fontSize: "15px",
  },

  playButton: {
    marginTop: "25px",
    background: "#6aa83f",
    color: "#fff",
    border: "none",
    borderRadius: "7px",
    padding: "12px 25px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
  },


  // =======================================================
  // GAME LIST
  // =======================================================

  gameList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },


  // =======================================================
  // GAME CARD
  // =======================================================

  gameCard: {
    minHeight: "88px",
    background: "#262522",
    border: "1px solid #333",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    padding: "12px 18px",
    boxSizing: "border-box",
    cursor: "pointer",
  },

  gameIcon: {
    width: "52px",
    height: "52px",
    background: "#333230",
    borderRadius: "7px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    color: "#aaa",
    marginRight: "18px",
  },

  gameInfo: {
    flex: 1,
  },

  gameTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "5px",
  },

  gameDate: {
    color: "#888",
    fontSize: "13px",
  },

  gameDetails: {
    color: "#666",
    fontSize: "12px",
    marginTop: "4px",
  },


  // =======================================================
  // RESULT
  // =======================================================

  result: {
    padding: "7px 12px",
    borderRadius: "5px",
    fontSize: "13px",
    fontWeight: "bold",
    marginRight: "18px",
    whiteSpace: "nowrap",
  },

  whiteResult: {
    background: "rgba(255,255,255,0.12)",
    color: "#ddd",
  },

  blackResult: {
    background: "rgba(0,0,0,0.3)",
    color: "#aaa",
  },

  drawResult: {
    background: "rgba(120,120,120,0.18)",
    color: "#bbb",
  },

  resignedResult: {
    background: "rgba(180,130,60,0.18)",
    color: "#c6a66a",
  },

  abortedResult: {
    background: "rgba(120,120,120,0.12)",
    color: "#777",
  },

  analysisResult: {
    background: "rgba(106,168,63,0.15)",
    color: "#8bbf61",
  },


  // =======================================================
  // DELETE
  // =======================================================

  deleteButton: {
    width: "34px",
    height: "34px",
    background: "transparent",
    color: "#666",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    borderRadius: "5px",
  },
};

export default GameHistory;