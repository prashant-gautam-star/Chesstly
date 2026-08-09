import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useNavigate } from "react-router-dom";


// =========================================================
// PIECES
// =========================================================

const PIECES = [
  { type: "p", color: "b", symbol: "♟" },
  { type: "n", color: "b", symbol: "♞" },
  { type: "b", color: "b", symbol: "♝" },
  { type: "r", color: "b", symbol: "♜" },
  { type: "q", color: "b", symbol: "♛" },
  { type: "k", color: "b", symbol: "♚" },

  { type: "p", color: "w", symbol: "♙" },
  { type: "n", color: "w", symbol: "♘" },
  { type: "b", color: "w", symbol: "♗" },
  { type: "r", color: "w", symbol: "♖" },
  { type: "q", color: "w", symbol: "♕" },
  { type: "k", color: "w", symbol: "♔" },
];


// =========================================================
// EMPTY POSITION
// =========================================================

const EMPTY_POSITION = {};


// =========================================================
// FEN PIECE MAP
// =========================================================

function positionToFen(
  pieces,
  turn,
  whiteKingSide,
  whiteQueenSide,
  blackKingSide,
  blackQueenSide
) {

  const ranks = [];

  for (let rank = 8; rank >= 1; rank--) {

    let row = "";
    let empty = 0;

    for (let file = 0; file < 8; file++) {

      const square =
        String.fromCharCode(97 + file) +
        rank;

      const piece =
        pieces[square];

      if (!piece) {

        empty++;

      } else {

        if (empty > 0) {
          row += empty;
          empty = 0;
        }

        let symbol = piece.type;

        if (piece.color === "w") {
          symbol = symbol.toUpperCase();
        }

        row += symbol;
      }
    }

    if (empty > 0) {
      row += empty;
    }

    ranks.push(row);
  }


  let castling = "";

  if (whiteKingSide) {
    castling += "K";
  }

  if (whiteQueenSide) {
    castling += "Q";
  }

  if (blackKingSide) {
    castling += "k";
  }

  if (blackQueenSide) {
    castling += "q";
  }

  if (!castling) {
    castling = "-";
  }


  return (
    ranks.join("/") +
    " " +
    turn +
    " " +
    castling +
    " - 0 1"
  );
}


// =========================================================
// FEN -> POSITION
// =========================================================

function fenToPosition(fen) {

  const parts = fen.trim().split(/\s+/);

  if (parts.length < 4) {
    throw new Error("Invalid FEN");
  }

  const boardPart = parts[0];

  const rows = boardPart.split("/");

  if (rows.length !== 8) {
    throw new Error("Invalid board");
  }

  const pieces = {};

  for (let row = 0; row < 8; row++) {

    let file = 0;

    for (
      let i = 0;
      i < rows[row].length;
      i++
    ) {

      const character =
        rows[row][i];

      if (
        !isNaN(character)
      ) {

        file += Number(character);

      } else {

        if (file >= 8) {
          throw new Error("Invalid FEN");
        }

        const color =
          character ===
          character.toUpperCase()
            ? "w"
            : "b";

        const type =
          character.toLowerCase();

        const square =
          String.fromCharCode(
            97 + file
          ) +
          (8 - row);

        pieces[square] = {
          type,
          color,
        };

        file++;
      }
    }

    if (file !== 8) {
      throw new Error("Invalid FEN");
    }
  }

  return {
    pieces,

    turn:
      parts[1] === "b"
        ? "b"
        : "w",

    whiteKingSide:
      parts[2]?.includes("K") || false,

    whiteQueenSide:
      parts[2]?.includes("Q") || false,

    blackKingSide:
      parts[2]?.includes("k") || false,

    blackQueenSide:
      parts[2]?.includes("q") || false,
  };
}


// =========================================================
// COMPONENT
// =========================================================

function SetupPosition() {

  const navigate = useNavigate();


  // =======================================================
  // POSITION
  // =======================================================

  const [pieces, setPieces] =
    useState(EMPTY_POSITION);

  const [selectedPiece, setSelectedPiece] =
    useState({
      type: "p",
      color: "w",
    });

  const [deleteMode, setDeleteMode] =
    useState(false);


  // =======================================================
  // GAME SETTINGS
  // =======================================================

  const [sideToMove, setSideToMove] =
    useState("w");

  const [whiteKingSide, setWhiteKingSide] =
    useState(false);

  const [whiteQueenSide, setWhiteQueenSide] =
    useState(false);

  const [blackKingSide, setBlackKingSide] =
    useState(false);

  const [blackQueenSide, setBlackQueenSide] =
    useState(false);


  // =======================================================
  // FEN
  // =======================================================

  const [fenInput, setFenInput] =
    useState("");

  const [message, setMessage] =
    useState("");


  // =======================================================
  // CURRENT FEN
  // =======================================================

  function getCurrentFen() {

    return positionToFen(
      pieces,
      sideToMove,
      whiteKingSide,
      whiteQueenSide,
      blackKingSide,
      blackQueenSide
    );
  }


  // =======================================================
  // CLICK BOARD SQUARE
  // =======================================================

  function handleSquareClick(square) {

    console.log(
      "Clicked square:",
      square
    );


    setPieces((currentPieces) => {

      const updatedPieces = {
        ...currentPieces,
      };


      // DELETE MODE

      if (deleteMode) {

        delete updatedPieces[square];

        return updatedPieces;
      }


      // PLACE SELECTED PIECE

      updatedPieces[square] = {
        type:
          selectedPiece.type,

        color:
          selectedPiece.color,
      };


      return updatedPieces;
    });


    setMessage("");
  }


  // =======================================================
  // SELECT PIECE
  // =======================================================

  function selectPiece(piece) {

    setSelectedPiece({
      type:
        piece.type,

      color:
        piece.color,
    });

    setDeleteMode(false);
  }


  // =======================================================
  // DELETE MODE
  // =======================================================

  function toggleDeleteMode() {

    setDeleteMode(
      (previous) =>
        !previous
    );
  }


  // =======================================================
  // RESET
  // =======================================================

  function resetBoard() {

    setPieces({});

    setSelectedPiece({
      type: "p",
      color: "w",
    });

    setDeleteMode(false);

    setSideToMove("w");

    setWhiteKingSide(false);
    setWhiteQueenSide(false);

    setBlackKingSide(false);
    setBlackQueenSide(false);

    setFenInput("");

    setMessage("");
  }


  // =======================================================
  // SIDE TO MOVE
  // =======================================================

  function changeSide(event) {

    setSideToMove(
      event.target.value
    );
  }


  // =======================================================
  // CASTLING
  // =======================================================

  function toggleCastling(type) {

    if (type === "wk") {
      setWhiteKingSide(
        previous => !previous
      );
    }

    if (type === "wq") {
      setWhiteQueenSide(
        previous => !previous
      );
    }

    if (type === "bk") {
      setBlackKingSide(
        previous => !previous
      );
    }

    if (type === "bq") {
      setBlackQueenSide(
        previous => !previous
      );
    }
  }


  // =======================================================
  // LOAD FEN
  // =======================================================

  function loadFen() {

    try {

      const data =
        fenToPosition(
          fenInput
        );


      setPieces(
        data.pieces
      );

      setSideToMove(
        data.turn
      );

      setWhiteKingSide(
        data.whiteKingSide
      );

      setWhiteQueenSide(
        data.whiteQueenSide
      );

      setBlackKingSide(
        data.blackKingSide
      );

      setBlackQueenSide(
        data.blackQueenSide
      );


      setMessage(
        "Position loaded."
      );

    } catch {

      setMessage(
        "Invalid FEN."
      );
    }
  }


  // =======================================================
  // ANALYZE
  // =======================================================

  function analyzePosition() {

    const fen =
      getCurrentFen();


    // Make sure there is at least
    // one king of each color before
    // sending to chess.js/backend.

    const whiteKing =
      Object.values(pieces)
        .some(
          piece =>
            piece.type === "k" &&
            piece.color === "w"
        );

    const blackKing =
      Object.values(pieces)
        .some(
          piece =>
            piece.type === "k" &&
            piece.color === "b"
        );


    if (
      !whiteKing ||
      !blackKing
    ) {

      setMessage(
        "Add both kings before analyzing."
      );

      return;
    }


    navigate(
      "/analysis",
      {
        state: {
          fen,
        },
      }
    );
  }


  // =======================================================
  // BOARD FEN
  // =======================================================

  const boardFen =
    getCurrentFen();


  // =======================================================
  // BOARD OPTIONS
  // =======================================================

  const boardOptions = {

    position:
      boardFen,

    boardOrientation:
      "white",

    allowDragging:
      false,

    onSquareClick:
      ({ square }) =>
        handleSquareClick(square),

    showNotation:
      true,

    darkSquareStyle: {
      backgroundColor:
        "#769656",
    },

    lightSquareStyle: {
      backgroundColor:
        "#eeeed2",
    },
  };


  // =======================================================
  // UI
  // =======================================================

  return (

    <div style={styles.page}>

      {/* =================================================
          LEFT SIDE
      ================================================= */}

      <div style={styles.leftSide}>

        <div style={styles.player}>

          <div style={styles.avatar}>
            ♟
          </div>

          <span>
            Black
          </span>

        </div>


        <div style={styles.boardWrapper}>

          <Chessboard
            options={
              boardOptions
            }
          />

        </div>


        <div style={styles.player}>

          <div style={styles.avatar}>
            ♙
          </div>

          <span>
            White
          </span>

        </div>

      </div>


      {/* =================================================
          RIGHT PANEL
      ================================================= */}

      <div style={styles.panel}>

        {/* HEADER */}

        <div style={styles.header}>

          <button
            style={
              styles.backButton
            }
            onClick={() =>
              navigate(
                "/analysis-menu"
              )
            }
          >
            ←
          </button>

          <h1
            style={
              styles.title
            }
          >
            ＋ Setup Position
          </h1>

        </div>


        {/* =================================================
            PIECES
        ================================================= */}

        <div
          style={
            styles.pieceArea
          }
        >

          {/* BLACK PIECES */}

          <div
            style={
              styles.pieceRow
            }
          >

            {PIECES
              .filter(
                piece =>
                  piece.color === "b"
              )
              .map(
                piece => (

                  <button
                    key={
                      piece.color +
                      piece.type
                    }
                    style={{
                      ...styles.pieceButton,

                      ...(selectedPiece.type ===
                        piece.type &&
                      selectedPiece.color ===
                        piece.color &&
                      !deleteMode
                        ? styles.selectedPiece
                        : {}),
                    }}
                    onClick={() =>
                      selectPiece(
                        piece
                      )
                    }
                  >
                    {piece.symbol}
                  </button>

                )
              )}

          </div>


          {/* WHITE PIECES */}

          <div
            style={
              styles.pieceRow
            }
          >

            {PIECES
              .filter(
                piece =>
                  piece.color === "w"
              )
              .map(
                piece => (

                  <button
                    key={
                      piece.color +
                      piece.type
                    }
                    style={{
                      ...styles.pieceButton,

                      ...(selectedPiece.type ===
                        piece.type &&
                      selectedPiece.color ===
                        piece.color &&
                      !deleteMode
                        ? styles.selectedPiece
                        : {}),
                    }}
                    onClick={() =>
                      selectPiece(
                        piece
                      )
                    }
                  >
                    {piece.symbol}
                  </button>

                )
              )}

          </div>

        </div>


        {/* =================================================
            CONTROLS
        ================================================= */}

        <div
          style={
            styles.controls
          }
        >

          <select
            value={
              sideToMove
            }
            onChange={
              changeSide
            }
            style={
              styles.select
            }
          >

            <option value="w">
              White to move
            </option>

            <option value="b">
              Black to move
            </option>

          </select>


          <button
            style={
              styles.iconButton
            }
            onClick={() => {

              setSideToMove(
                previous =>
                  previous === "w"
                    ? "b"
                    : "w"
              );

            }}
          >
            ⇅
          </button>


          <button
            style={
              styles.iconButton
            }
            onClick={
              resetBoard
            }
          >
            ↻
          </button>


          <button
            style={{
              ...styles.iconButton,

              ...(deleteMode
                ? styles.deleteActive
                : {}),
            }}
            onClick={
              toggleDeleteMode
            }
          >
            🗑
          </button>

        </div>


        {/* =================================================
            CASTLING
        ================================================= */}

        <div
          style={
            styles.castling
          }
        >

          <div>

            <div
              style={
                styles.castlingTitle
              }
            >
              White
            </div>

            <label
              style={
                styles.checkbox
              }
            >

              <input
                type="checkbox"
                checked={
                  whiteKingSide
                }
                onChange={() =>
                  toggleCastling(
                    "wk"
                  )
                }
              />

              {" "} (O-O)

            </label>


            <label
              style={
                styles.checkbox
              }
            >

              <input
                type="checkbox"
                checked={
                  whiteQueenSide
                }
                onChange={() =>
                  toggleCastling(
                    "wq"
                  )
                }
              />

              {" "} (O-O-O)

            </label>

          </div>


          <div>

            <div
              style={
                styles.castlingTitle
              }
            >
              Black
            </div>

            <label
              style={
                styles.checkbox
              }
            >

              <input
                type="checkbox"
                checked={
                  blackKingSide
                }
                onChange={() =>
                  toggleCastling(
                    "bk"
                  )
                }
              />

              {" "} (O-O)

            </label>


            <label
              style={
                styles.checkbox
              }
            >

              <input
                type="checkbox"
                checked={
                  blackQueenSide
                }
                onChange={() =>
                  toggleCastling(
                    "bq"
                  )
                }
              />

              {" "} (O-O-O)

            </label>

          </div>

        </div>


        {/* =================================================
            FEN
        ================================================= */}

        <div
          style={
            styles.fenArea
          }
        >

          <input
            value={
              fenInput
            }
            onChange={
              event =>
                setFenInput(
                  event.target.value
                )
            }
            placeholder={
              "FEN"
            }
            style={
              styles.fenInput
            }
          />


          {message && (

            <div
              style={
                styles.message
              }
            >
              {message}
            </div>

          )}

        </div>


        {/* LOAD */}

        <button
          style={
            styles.loadButton
          }
          onClick={
            loadFen
          }
        >
          Load
        </button>


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
          >
            ⏮
          </button>

          <button
            style={
              styles.navButton
            }
          >
            ‹
          </button>

          <button
            style={
              styles.navButton
            }
          >
            ›
          </button>

          <button
            style={
              styles.navButton
            }
          >
            ⏭
          </button>

        </div>


        {/* ANALYZE */}

        <button
          style={
            styles.analyzeButton
          }
          onClick={
            analyzePosition
          }
        >
          Analyze Position
        </button>

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
    display: "flex",
    gap: "20px",
    padding: "25px 38px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, sans-serif",
  },


  leftSide: {
    flex: 1,
    maxWidth: "750px",
    display: "flex",
    flexDirection: "column",
  },


  player: {
    height: "55px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    fontSize: "18px",
    fontWeight: "bold",
  },


  avatar: {
    width: "48px",
    height: "48px",
    background: "#444",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    color: "#aaa",
  },


  boardWrapper: {
    width: "100%",
    aspectRatio: "1",
  },


  panel: {
    width: "570px",
    minHeight:
      "calc(100vh - 50px)",
    background: "#262522",
    borderRadius: "8px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },


  header: {
    height: "65px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "0 18px",
    background: "#292826",
    borderBottom:
      "1px solid #444",
  },


  backButton: {
    background: "none",
    border: "none",
    color: "#bbb",
    fontSize: "38px",
    cursor: "pointer",
  },


  title: {
    margin: 0,
    fontSize: "23px",
  },


  pieceArea: {
    padding: "18px 25px",
    background: "#444341",
  },


  pieceRow: {
    display: "flex",
    justifyContent:
      "space-around",
    marginBottom: "10px",
  },


  pieceButton: {
    width: "70px",
    height: "70px",
    background:
      "transparent",
    border:
      "2px solid transparent",
    borderRadius: "6px",
    fontSize: "48px",
    cursor: "pointer",
    color: "#fff",
  },


  selectedPiece: {
    background:
      "rgba(255,255,255,0.15)",
    border:
      "2px solid #aaa",
  },


  controls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "14px 18px",
  },


  select: {
    flex: 1,
    height: "42px",
    background: "#383735",
    color: "#ddd",
    border:
      "1px solid #555",
    borderRadius: "6px",
    padding:
      "0 12px",
    fontSize: "16px",
  },


  iconButton: {
    width: "43px",
    height: "42px",
    background: "#383735",
    color: "#aaa",
    border: "none",
    borderRadius: "6px",
    fontSize: "21px",
    cursor: "pointer",
  },


  deleteActive: {
    background: "#9b4444",
    color: "#fff",
  },


  castling: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "40px",
    padding:
      "0 22px 10px",
  },


  castlingTitle: {
    color: "#999",
    fontSize: "16px",
    marginBottom: "8px",
  },


  checkbox: {
    display: "block",
    color: "#aaa",
    margin:
      "9px 0",
    fontSize: "15px",
  },


  fenArea: {
    padding:
      "5px 18px 10px",
  },


  fenInput: {
    width: "100%",
    height: "42px",
    boxSizing: "border-box",
    background: "#383735",
    color: "#bbb",
    border:
      "1px solid #555",
    borderRadius: "6px",
    padding:
      "0 12px",
    fontSize: "14px",
  },


  message: {
    color: "#8bc34a",
    fontSize: "13px",
    marginTop: "6px",
  },


  loadButton: {
    margin:
      "0 18px 16px",
    height: "48px",
    background: "#6aa83f",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },


  navigation: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, 1fr)",
    gap: "10px",
    padding:
      "0 18px 15px",
  },


  navButton: {
    height: "52px",
    background: "#333230",
    color: "#777",
    border: "none",
    borderRadius: "8px",
    fontSize: "28px",
  },


  analyzeButton: {
    margin:
      "auto 18px 18px",
    height: "50px",
    background: "#6aa83f",
    color: "#fff",
    border: "none",
    borderRadius: "7px",
    fontSize: "17px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};


export default SetupPosition;