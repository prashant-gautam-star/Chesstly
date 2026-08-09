import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function Analysis() {
  const navigate = useNavigate();
  const location = useLocation();

  const gameData = location.state;

  const [analysisData, setAnalysisData] = useState([]);
  const [currentMove, setCurrentMove] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const moves = gameData?.moves || [];
  const positions = gameData?.positions || [];
  const playerColor = gameData?.playerColor || "w";
  const botRating = gameData?.botRating || 1500;


  // =========================================================
  // ANALYZE GAME
  // =========================================================

  useEffect(() => {

    if (!gameData || moves.length === 0) {

      setError(
        "No game was provided for analysis."
      );

      setLoading(false);

      return;
    }


    async function analyze() {

      try {

        const startingFen =
          new Chess().fen();

        const fens = [
          startingFen,
          ...positions.map(
            (position) =>
              position.fen
          ),
        ];


        const response =
          await fetch(
            "http://127.0.0.1:5000/api/analyze",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                fens,
              }),
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
              "Analysis failed"
          );
        }


        setAnalysisData(
          data.analyses || []
        );

        setCurrentMove(0);

      } catch (err) {

        console.error(err);

        setError(
          "Analysis failed. Make sure Flask and Stockfish are running."
        );

      } finally {

        setLoading(false);
      }
    }


    analyze();

  }, []);


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (
      <div style={styles.loadingScreen}>

        <div style={styles.loadingLogo}>
          Chesstly
        </div>

        <div style={styles.loadingTitle}>
          Analyzing your game
        </div>

        <div style={styles.loadingText}>
          Stockfish is analyzing every position...
        </div>

        <div style={styles.spinner}></div>

        <div style={styles.loadingHint}>
          This may take a few seconds
        </div>

      </div>
    );
  }


  // =========================================================
  // ERROR
  // =========================================================

  if (error) {

    return (
      <div style={styles.loadingScreen}>

        <div style={styles.errorTitle}>
          Analysis Error
        </div>

        <div style={styles.errorText}>
          {error}
        </div>

        <button
          style={styles.backButton}
          onClick={() =>
            navigate(-1)
          }
        >
          ← Back
        </button>

      </div>
    );
  }


  // =========================================================
  // CURRENT POSITION
  // =========================================================

  const currentAnalysis =
    analysisData[currentMove] || {};

  const currentFen =
    currentAnalysis.fen ||
    new Chess().fen();

  const evaluation =
    currentAnalysis.evaluation ??
    0;

  const lines =
    currentAnalysis.lines ||
    [];


  // =========================================================
  // EVALUATION
  // =========================================================

  function getNumericEvaluation(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return 0;
    }


    if (
      typeof value === "string"
    ) {

      if (
        value.startsWith("M")
      ) {

        const mate =
          parseInt(
            value.substring(1),
            10
          );

        return mate > 0
          ? 10
          : -10;
      }


      value = Number(value);
    }


    return Number.isNaN(value)
      ? 0
      : value;
  }


  function formatEvaluation(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "0.00";
    }


    if (
      typeof value === "string"
    ) {

      if (
        value.startsWith("M")
      ) {
        return value;
      }

      value = Number(value);
    }


    if (Number.isNaN(value)) {
      return "0.00";
    }


    if (value > 0) {
      return `+${value.toFixed(2)}`;
    }


    return value.toFixed(2);
  }


  const numericEval =
    getNumericEvaluation(
      evaluation
    );


  // =========================================================
  // EVALUATION BAR
  // =========================================================

  const evalPercent =
    50 +
    Math.max(
      -10,
      Math.min(
        10,
        numericEval
      )
    ) * 5;


  // =========================================================
  // BEST MOVE ARROW
  // =========================================================

  function getBestMoveArrow() {

    const bestMove =
      lines[0]?.bestMove;


    if (
      !bestMove ||
      bestMove.length < 4
    ) {
      return [];
    }


    return [
      {
        startSquare:
          bestMove.substring(
            0,
            2
          ),

        endSquare:
          bestMove.substring(
            2,
            4
          ),

        color: "#42a5f5",
      },
    ];
  }


  // =========================================================
  // MOVE QUALITY
  // =========================================================

  function getMoveUcis() {

    const board = new Chess();
    const ucis = [];

    for (const san of moves) {
      try {
        const move = board.move(san);

        if (!move) {
          ucis.push("");
          continue;
        }

        ucis.push(
          `${move.from}${move.to}${move.promotion || ""}`
        );
      } catch {
        ucis.push("");
      }
    }

    return ucis;
  }


  function getMoveQuality(moveIndex) {

    if (
      moveIndex < 0 ||
      moveIndex >= moves.length
    ) {
      return {
        label: "",
        style: styles.qualityDefault,
      };
    }

    const before =
      analysisData[moveIndex] || {};

    const after =
      analysisData[moveIndex + 1] || {};

    const playedUci =
      moveUcis[moveIndex];

    const bestMove =
      before.lines?.[0]?.bestMove || "";

    const beforeEval =
      getNumericEvaluation(
        before.evaluation
      );

    const afterEval =
      getNumericEvaluation(
        after.evaluation
      );

    // The engine score is from the side-to-move's
    // perspective. After the move, the perspective flips.
    const evalLoss =
      Math.max(
        0,
        beforeEval + afterEval
      );

    const san = moves[moveIndex] || "";

    // A small tactical heuristic gives us a useful
    // "Brilliant" label without pretending to reproduce
    // Chess.com's full classification algorithm.
    const tacticalMove =
      san.includes("x") ||
      san.includes("+") ||
      san.includes("#") ||
      san.includes("=");

    if (
      playedUci &&
      bestMove &&
      playedUci === bestMove &&
      tacticalMove &&
      evalLoss <= 0.05
    ) {
      return {
        label: "Brilliant",
        style: styles.qualityBrilliant,
      };
    }

    if (
      playedUci &&
      bestMove &&
      playedUci === bestMove
    ) {
      return {
        label: "Best",
        style: styles.qualityBest,
      };
    }

    if (evalLoss <= 0.05) {
      return {
        label: "Excellent",
        style: styles.qualityExcellent,
      };
    }

    if (evalLoss <= 0.20) {
      return {
        label: "Good",
        style: styles.qualityGood,
      };
    }

    if (evalLoss <= 0.50) {
      return {
        label: "Inaccurate",
        style: styles.qualityInaccurate,
      };
    }

    if (evalLoss <= 1.00) {
      return {
        label: "Mistake",
        style: styles.qualityMistake,
      };
    }

    return {
      label: "Blunder",
      style: styles.qualityBlunder,
    };
  }


  const moveUcis =
    getMoveUcis();


  // =========================================================
  // NAVIGATION
  // =========================================================

  function firstMove() {

    setCurrentMove(0);
  }


  function previousMove() {

    setCurrentMove(
      Math.max(
        0,
        currentMove - 1
      )
    );
  }


  function nextMove() {

    setCurrentMove(
      Math.min(
        Math.max(
          0,
          analysisData.length - 1
        ),
        currentMove + 1
      )
    );
  }


  function lastMove() {

    setCurrentMove(
      Math.max(
        0,
        analysisData.length - 1
      )
    );
  }


  // =========================================================
  // SAVE GAME
  // =========================================================

  function saveGame() {
    try {
      const existing =
        JSON.parse(
          localStorage.getItem(
            "chesstly_game_history"
          ) || "[]"
        );

      const gameId =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}`;

      const savedGame = {
        id: gameId,
        date: new Date().toISOString(),
        source: "analysis",
        result:
          gameData?.gameStatus ||
          "Analysis",
        botRating:
          gameData?.botRating || null,
        playerColor:
          gameData?.playerColor || "w",
        moves: [...moves],
        positions: [...positions],
        fen:
          gameData?.fen ||
          currentFen,
        pgn:
          gameData?.pgn || "",
      };

      const updated = [
        savedGame,
        ...existing,
      ];

      localStorage.setItem(
        "chesstly_game_history",
        JSON.stringify(updated)
      );

      setSavedMessage(
        "Game saved to history"
      );

      setTimeout(() => {
        setSavedMessage("");
      }, 2500);

    } catch (err) {
      console.error(
        "Could not save game:",
        err
      );

      setSavedMessage(
        "Could not save game"
      );
    }
  }


  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div style={styles.page}>

      {/* TOP BAR */}

      <div style={styles.topBar}>

        <button
          style={styles.backButton}
          onClick={() =>
            navigate(-1)
          }
        >
          ← Back
        </button>

        <div style={styles.title}>
          Chesstly Analysis
        </div>

        <div style={styles.saveArea}>

          <button
            style={styles.saveButton}
            onClick={saveGame}
          >
            Save Game
          </button>

          {savedMessage && (
            <span style={styles.savedMessage}>
              {savedMessage}
            </span>
          )}

        </div>

        <div style={styles.botInfo}>
          {botRating
            ? `Bot ${botRating}`
            : "Analysis"}
        </div>

      </div>


      {/* MAIN */}

      <div style={styles.main}>

        {/* EVALUATION BAR */}

        <div style={styles.evalContainer}>

          <div
            style={{
              ...styles.blackEval,

              height:
                `${100 - evalPercent}%`,
            }}
          />

          <div
            style={{
              ...styles.whiteEval,

              height:
                `${evalPercent}%`,
            }}
          />

          <div style={styles.evalValue}>
            {formatEvaluation(
              evaluation
            )}
          </div>

        </div>


        {/* BOARD */}

        <div style={styles.boardArea}>

          <div style={styles.player}>
            {playerColor === "w"
              ? "Black"
              : "White"}
          </div>


          <div style={styles.board}>

            <Chessboard
              options={{
                position:
                  currentFen,

                boardOrientation:
                  playerColor === "w"
                    ? "white"
                    : "black",

                allowDragging:
                  false,

                arrows:
                  getBestMoveArrow(),
              }}
            />

          </div>


          <div style={styles.player}>
            {playerColor === "w"
              ? "White"
              : "Black"}
          </div>

        </div>


        {/* RIGHT PANEL */}

        <div style={styles.panel}>

          {/* HEADER */}

          <div
            style={
              styles.panelHeader
            }
          >

            <div>
              🔎 Analysis
            </div>

            <div
              style={
                styles.stockfish
              }
            >
              Stockfish 18
            </div>

          </div>


          {/* ENGINE LINES */}

          <div
            style={
              styles.linesHeader
            }
          >
            Engine Lines
          </div>


          <div
            style={
              styles.engineLines
            }
          >

            {lines
              .slice(0, 3)
              .map(
                (
                  line,
                  index
                ) => (

                  <div
                    key={index}
                    style={
                      styles.engineLine
                    }
                  >

                    <div
                      style={
                        styles.lineEvaluation
                      }
                    >
                      {formatEvaluation(
                        line.evaluation
                      )}
                    </div>


                    <div
                      style={
                        styles.lineMoves
                      }
                    >

                      {line.moves
                        ?.slice(
                          0,
                          10
                        )
                        .map(
                          (
                            move,
                            moveIndex
                          ) => (

                            <span
                              key={
                                moveIndex
                              }
                            >
                              {move}{" "}
                            </span>

                          )
                        )}

                    </div>

                  </div>

                )
              )}

          </div>


          {/* MOVES */}

          <div
            style={
              styles.movesHeader
            }
          >

            <span>
              Moves
            </span>

            <span
              style={
                styles.moveCount
              }
            >
              {Math.ceil(
                moves.length / 2
              )} moves
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
                  moves.length / 2
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

                const whiteIndex =
                  index * 2 + 1;

                const blackIndex =
                  index * 2 + 2;


                return (
                  <div
                    key={index}
                    style={
                      styles.moveRow
                    }
                  >

                    <div
                      style={
                        styles.moveNumber
                      }
                    >
                      {index + 1}.
                    </div>


                    <button
                      style={{
                        ...styles.moveButton,

                        ...(currentMove ===
                        whiteIndex
                          ? styles.activeMove
                          : {}),
                      }}
                      onClick={() =>
                        setCurrentMove(
                          whiteIndex
                        )
                      }
                    >
                      {whiteMove && (
                        <>
                          <span
                            style={
                              styles.moveText
                            }
                          >
                            {whiteMove}
                          </span>

                          <span
                            style={
                              getMoveQuality(
                                whiteIndex - 1
                              ).style
                            }
                          >
                            {getMoveQuality(
                              whiteIndex - 1
                            ).label}
                          </span>
                        </>
                      )}
                    </button>


                    <button
                      style={{
                        ...styles.moveButton,

                        ...(currentMove ===
                        blackIndex
                          ? styles.activeMove
                          : {}),
                      }}
                      disabled={
                        !blackMove
                      }
                      onClick={() =>
                        setCurrentMove(
                          blackIndex
                        )
                      }
                    >
                      {blackMove && (
                        <>
                          <span
                            style={
                              styles.moveText
                            }
                          >
                            {blackMove}
                          </span>

                          <span
                            style={
                              getMoveQuality(
                                blackIndex - 1
                              ).style
                            }
                          >
                            {getMoveQuality(
                              blackIndex - 1
                            ).label}
                          </span>
                        </>
                      )}
                    </button>

                  </div>
                );
              }
            )}

          </div>


          {/* NAVIGATION */}

          <div
            style={
              styles.navigation
            }
          >

            <button
              style={
                styles.navButton
              }
              onClick={
                firstMove
              }
            >
              |◀
            </button>

            <button
              style={
                styles.navButton
              }
              onClick={
                previousMove
              }
            >
              ◀
            </button>

            <button
              style={
                styles.navButton
              }
              onClick={
                nextMove
              }
            >
              ▶
            </button>

            <button
              style={
                styles.navButton
              }
              onClick={
                lastMove
              }
            >
              ▶|
            </button>

          </div>

        </div>

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
    color: "white",
    padding: "25px 35px",
    boxSizing: "border-box",
  },

  topBar: {
    maxWidth: "1250px",
    margin: "0 auto 20px",

    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  title: {
    fontSize: "28px",
    fontWeight: "bold",
  },

  botInfo: {
    color: "#999",
    fontSize: "15px",
  },

  saveArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginLeft: "auto",
  },

  saveButton: {
    background: "#6aa83f",
    color: "white",
    border: "none",
    borderRadius: "7px",
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },

  savedMessage: {
    color: "#8bc34a",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  backButton: {
    background: "#262522",
    color: "white",

    border:
      "1px solid #3a3936",

    borderRadius: "7px",

    padding:
      "10px 18px",

    cursor: "pointer",

    fontSize: "15px",
  },


  // =======================================================
  // MAIN
  // =======================================================

  main: {
    maxWidth: "1250px",

    margin: "0 auto",

    display: "grid",

    gridTemplateColumns:
      "35px 650px 400px",

    gap: "15px",

    alignItems:
      "start",
  },


  // =======================================================
  // EVALUATION BAR
  // =======================================================

  evalContainer: {
    width: "35px",

    height: "650px",

    borderRadius: "4px",

    overflow: "hidden",

    position: "relative",

    background: "#eee",
  },

  blackEval: {
    width: "100%",

    background: "#171717",

    transition:
      "height 0.3s ease",
  },

  whiteEval: {
    width: "100%",

    background: "#eeeeee",

    transition:
      "height 0.3s ease",
  },

  evalValue: {
    position: "absolute",

    top: "50%",

    left: 0,
    right: 0,

    transform:
      "translateY(-50%)",

    textAlign: "center",

    fontSize: "9px",

    fontWeight: "bold",

    color: "#555",

    writingMode:
      "vertical-rl",
  },


  // =======================================================
  // BOARD
  // =======================================================

  boardArea: {
    width: "650px",
  },

  board: {
    width: "650px",

    overflow: "hidden",

    borderRadius: "7px",
  },

  player: {
    height: "32px",

    display: "flex",

    alignItems: "center",

    padding: "0 5px",

    color: "#aaa",

    fontSize: "15px",
  },


  // =======================================================
  // PANEL
  // =======================================================

  panel: {
    width: "400px",

    height: "650px",

    background: "#262522",

    borderRadius: "10px",

    overflow: "hidden",

    display: "flex",

    flexDirection:
      "column",
  },

  panelHeader: {
    height: "55px",

    padding: "0 18px",

    display: "flex",

    alignItems: "center",

    justifyContent:
      "space-between",

    borderBottom:
      "1px solid #444",

    fontSize: "20px",

    fontWeight: "bold",
  },

  stockfish: {
    color: "#888",

    fontSize: "12px",

    fontWeight: "normal",
  },


  // =======================================================
  // ENGINE LINES
  // =======================================================

  linesHeader: {
    padding:
      "10px 15px",

    color: "#999",

    fontSize: "13px",

    borderBottom:
      "1px solid #444",
  },

  engineLines: {
    padding:
      "5px 10px",

    borderBottom:
      "1px solid #444",
  },

  engineLine: {
    display: "grid",

    gridTemplateColumns:
      "60px 1fr",

    gap: "8px",

    alignItems:
      "center",

    minHeight: "42px",
  },

  lineEvaluation: {
    background: "#e7e7e7",

    color: "#222",

    borderRadius: "4px",

    padding: "5px",

    textAlign: "center",

    fontSize: "12px",

    fontWeight: "bold",
  },

  lineMoves: {
    color: "#ddd",

    fontSize: "13px",

    overflow: "hidden",

    whiteSpace:
      "nowrap",

    textOverflow:
      "ellipsis",
  },


  // =======================================================
  // MOVES
  // =======================================================

  movesHeader: {
    display: "flex",

    justifyContent:
      "space-between",

    padding:
      "12px 18px",

    borderBottom:
      "1px solid #444",

    color: "#aaa",

    fontSize: "14px",
  },

  moveCount: {
    color: "#666",
  },

  moveList: {
    flex: 1,

    overflowY: "auto",

    padding: "5px 8px",
  },

  moveRow: {
    display: "grid",

    gridTemplateColumns:
      "40px 1fr 1fr",

    alignItems:
      "center",

    minHeight: "38px",
  },

  moveNumber: {
    color: "#777",

    paddingLeft: "8px",

    fontSize: "14px",
  },

  moveButton: {
    background:
      "transparent",

    color: "#ddd",

    border: "none",

    textAlign: "left",

    padding:
      "8px 12px",

    borderRadius: "4px",

    cursor: "pointer",

    fontSize: "15px",

    fontWeight: "bold",
  },

  moveText: {
    display: "inline-block",
    minWidth: "32px",
  },

  qualityDefault: {
    color: "#777",
    fontSize: "9px",
    fontWeight: "bold",
    marginLeft: "5px",
  },

  qualityBrilliant: {
    color: "#00bfa5",
    fontSize: "9px",
    fontWeight: "bold",
    marginLeft: "5px",
  },

  qualityBest: {
    color: "#8bd450",
    fontSize: "9px",
    fontWeight: "bold",
    marginLeft: "5px",
  },

  qualityExcellent: {
    color: "#65c466",
    fontSize: "9px",
    fontWeight: "bold",
    marginLeft: "5px",
  },

  qualityGood: {
    color: "#8fbf6a",
    fontSize: "9px",
    fontWeight: "bold",
    marginLeft: "5px",
  },

  qualityInaccurate: {
    color: "#d5b04a",
    fontSize: "9px",
    fontWeight: "bold",
    marginLeft: "5px",
  },

  qualityMistake: {
    color: "#e39a42",
    fontSize: "9px",
    fontWeight: "bold",
    marginLeft: "5px",
  },

  qualityBlunder: {
    color: "#e05a47",
    fontSize: "9px",
    fontWeight: "bold",
    marginLeft: "5px",
  },

  activeMove: {
    background: "#d5b04a",
    color: "#171717",
  },


  // =======================================================
  // NAVIGATION
  // =======================================================

  navigation: {
    display: "grid",

    gridTemplateColumns:
      "repeat(4, 1fr)",

    gap: "8px",

    padding: "12px",

    borderTop:
      "1px solid #444",
  },

  navButton: {
    height: "42px",

    background: "#383735",

    color: "white",

    border: "none",

    borderRadius: "7px",

    cursor: "pointer",

    fontSize: "17px",
  },


  // =======================================================
  // LOADING
  // =======================================================

  loadingScreen: {
    minHeight: "100vh",

    background: "#161512",

    color: "white",

    display: "flex",

    flexDirection:
      "column",

    alignItems: "center",

    justifyContent:
      "center",
  },

  loadingLogo: {
    fontSize: "48px",

    fontWeight: "bold",

    marginBottom:
      "35px",
  },

  loadingTitle: {
    fontSize: "28px",

    fontWeight: "bold",
  },

  loadingText: {
    color: "#999",

    marginTop: "10px",

    fontSize: "16px",
  },

  loadingHint: {
    color: "#666",

    marginTop: "20px",

    fontSize: "13px",
  },

  spinner: {
    width: "38px",

    height: "38px",

    border:
      "4px solid #333",

    borderTop:
      "4px solid #fff",

    borderRadius: "50%",

    marginTop: "30px",

    animation:
      "spin 1s linear infinite",
  },

  errorTitle: {
    fontSize: "30px",

    fontWeight: "bold",

    marginBottom:
      "15px",
  },

  errorText: {
    color: "#ff7777",

    marginBottom:
      "25px",
  },
};