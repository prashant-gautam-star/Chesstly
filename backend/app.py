from flask import Flask, request, jsonify
from flask_cors import CORS
import chess
import chess.engine
import os

app = Flask(__name__)
CORS(app)

if os.name == "nt":
    STOCKFISH_PATH = "stockfish/stockfish-windows-x86-64-avx2.exe"
else:
    STOCKFISH_PATH = "stockfish"


# =========================================================
# BOT MOVE
# =========================================================

@app.route("/api/bot-move", methods=["POST"])
def bot_move():
    data = request.json

    board = chess.Board(data["fen"])
    rating = int(data.get("rating", 1500))

    engine = chess.engine.SimpleEngine.popen_uci(
        STOCKFISH_PATH
    )

    try:
        if rating >= 1320:
            engine.configure({
                "UCI_LimitStrength": True,
                "UCI_Elo": min(rating, 3000)
            })
        else:
            engine.configure({
                "Skill Level": 0
            })

        result = engine.play(
            board,
            chess.engine.Limit(depth=12)
        )

        move = result.move.uci()

        return jsonify({
            "move": move
        })

    finally:
        engine.quit()


# =========================================================
# GAME ANALYSIS
# =========================================================

@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.json

    # React sends:
    #
    # {
    #     "fens": [
    #         starting_position,
    #         position_after_move_1,
    #         position_after_move_2,
    #         ...
    #     ]
    # }

    fens = data.get("fens", [])

    if not fens:
        return jsonify({
            "error": "No positions were provided"
        }), 400

    engine = chess.engine.SimpleEngine.popen_uci(
        STOCKFISH_PATH
    )

    analyses = []

    try:

        for fen in fens:

            board = chess.Board(fen)

            # Get the top 3 engine lines
            results = engine.analyse(
                board,
                chess.engine.Limit(depth=18),
                multipv=3
            )

            lines = []

            for result in results:

                # -------------------------------------------------
                # EVALUATION
                # -------------------------------------------------

                score = result["score"].white()

                if score.is_mate():

                    mate_number = score.mate()

                    if mate_number is None:
                        evaluation = 0
                    else:
                        evaluation = (
                            f"M{mate_number}"
                        )

                else:

                    centipawns = score.score(
                        mate_score=100000
                    )

                    if centipawns is None:
                        centipawns = 0

                    evaluation = (
                        centipawns / 100
                    )

                # -------------------------------------------------
                # PRINCIPAL VARIATION
                # -------------------------------------------------

                pv = result.get("pv", [])

                pv_board = chess.Board(fen)

                san_moves = []

                for move in pv[:10]:

                    try:
                        san = pv_board.san(move)
                        san_moves.append(san)
                        pv_board.push(move)

                    except Exception:
                        break

                # -------------------------------------------------
                # BEST MOVE
                # -------------------------------------------------

                if pv:
                    best_move = pv[0].uci()
                else:
                    best_move = None

                lines.append({
                    "evaluation": evaluation,
                    "bestMove": best_move,
                    "moves": san_moves
                })

            # -----------------------------------------------------
            # SAVE POSITION ANALYSIS
            # -----------------------------------------------------

            if lines:
                main_evaluation = lines[0]["evaluation"]
            else:
                main_evaluation = 0

            analyses.append({
                "fen": fen,
                "evaluation": main_evaluation,
                "lines": lines
            })

        return jsonify({
            "analyses": analyses
        })

    except Exception as error:

        print("ANALYSIS ERROR:")
        print(error)

        return jsonify({
            "error": str(error)
        }), 500

    finally:
        engine.quit()


# =========================================================
# TEST ROUTE
# =========================================================

@app.route("/")
def home():
    return "Chesstly backend is running!"


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":
    app.run(debug=True)