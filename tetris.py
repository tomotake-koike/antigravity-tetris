import curses
import random
import time

# テトロミノの形状定義
SHAPES = [
    [[1, 1, 1, 1]],  # I
    [[1, 1], [1, 1]],  # O
    [[0, 1, 0], [1, 1, 1]],  # T
    [[1, 0, 0], [1, 1, 1]],  # J
    [[0, 0, 1], [1, 1, 1]],  # L
    [[0, 1, 1], [1, 1, 0]],  # S
    [[1, 1, 0], [0, 1, 1]]   # Z
]

COLORS = [
    curses.COLOR_CYAN,
    curses.COLOR_YELLOW,
    curses.COLOR_MAGENTA,
    curses.COLOR_BLUE,
    curses.COLOR_WHITE, # Orange is not standard in 8 colors, using White/Orange-ish if possible or just mapping arbitrarily
    curses.COLOR_GREEN,
    curses.COLOR_RED
]

class Tetromino:
    def __init__(self, x, y, shape_idx):
        self.x = x
        self.y = y
        self.shape = SHAPES[shape_idx]
        self.color = shape_idx + 1  # 1-based color pair
        self.rotation = 0

    def rotate(self):
        # 90度回転
        self.shape = [list(row) for row in zip(*self.shape[::-1])]

class TetrisGame:
    def __init__(self, stdscr, level=1):
        self.stdscr = stdscr
        self.board_width = 10
        self.board_height = 20
        self.board = [[0] * self.board_width for _ in range(self.board_height)]
        self.score = 0
        self.level = level
        # 初期速度を3倍にする (インターバルを1/3にする)
        self.initial_speed = max(0.05, 1.0 - (self.level - 1) * 0.1) / 3.0
        self.base_speed = self.initial_speed
        self.game_over = False
        self.paused = False
        self.current_piece = self.new_piece()
        self.next_piece = self.new_piece()
        self.last_fall_time = time.time()
        self.last_score_check = 0

    def new_piece(self):
        shape_idx = random.randint(0, len(SHAPES) - 1)
        # 中央上部に出現
        return Tetromino(self.board_width // 2 - len(SHAPES[shape_idx][0]) // 2, 0, shape_idx)

    def check_collision(self, piece, adj_x=0, adj_y=0):
        for y, row in enumerate(piece.shape):
            for x, cell in enumerate(row):
                if cell:
                    new_x = piece.x + x + adj_x
                    new_y = piece.y + y + adj_y
                    if new_x < 0 or new_x >= self.board_width or new_y >= self.board_height:
                        return True
                    if new_y >= 0 and self.board[new_y][new_x]:
                        return True
        return False

    def merge_piece(self):
        for y, row in enumerate(self.current_piece.shape):
            for x, cell in enumerate(row):
                if cell:
                    board_y = self.current_piece.y + y
                    board_x = self.current_piece.x + x
                    if 0 <= board_y < self.board_height:
                        self.board[board_y][board_x] = self.current_piece.color

    def clear_lines(self):
        lines_cleared = 0
        new_board = [row for row in self.board if any(c == 0 for c in row)]
        lines_cleared = self.board_height - len(new_board)
        if lines_cleared > 0:
            # 新しい空行を上に追加
            for _ in range(lines_cleared):
                new_board.insert(0, [0] * self.board_width)
            self.board = new_board
            # スコア計算: 1ライン10点
            self.score += lines_cleared * 10
            
            # スピード更新: 30点ごとに現在のスピードを1/3にする
            speed_stage = self.score // 30
            self.base_speed = self.initial_speed * ((1/3) ** speed_stage)

    def toggle_pause(self):
        self.paused = not self.paused
        if not self.paused:
            self.last_fall_time = time.time()

    def update(self):
        if self.paused:
            return

        if time.time() - self.last_fall_time > self.base_speed:
            if not self.check_collision(self.current_piece, adj_y=1):
                self.current_piece.y += 1
            else:
                self.merge_piece()
                self.clear_lines()
                self.current_piece = self.next_piece
                self.next_piece = self.new_piece()
                if self.check_collision(self.current_piece):
                    self.game_over = True
            self.last_fall_time = time.time()

    def handle_input(self, key):
        if key == 27: # ESC key
            self.toggle_pause()
            return

        if self.paused:
            return

        if key == curses.KEY_LEFT or key == ord('a'):
            if not self.check_collision(self.current_piece, adj_x=-1):
                self.current_piece.x -= 1
        elif key == curses.KEY_RIGHT or key == ord('d'):
            if not self.check_collision(self.current_piece, adj_x=1):
                self.current_piece.x += 1
        elif key == curses.KEY_DOWN or key == ord('s'):
            if not self.check_collision(self.current_piece, adj_y=1):
                self.current_piece.y += 1
        elif key == curses.KEY_UP:
            original_shape = self.current_piece.shape
            self.current_piece.rotate()
            if self.check_collision(self.current_piece):
                self.current_piece.shape = original_shape 

    def draw(self):
        self.stdscr.erase()
        
        # ボード描画 (通常サイズ: 1セル = 縦1行 x 横2文字(全角))
        for y in range(self.board_height):
            for x in range(self.board_width):
                # block char: ■ (全角) or . (半角2つ)
                char = ' .' if self.board[y][x] == 0 else '■'
                color = curses.color_pair(self.board[y][x])
                self.stdscr.addstr(y + 1, x * 2 + 1, char, color)

        # 現在のピース描画
        if self.current_piece:
            for y, row in enumerate(self.current_piece.shape):
                for x, cell in enumerate(row):
                    if cell:
                        draw_x = (self.current_piece.x + x) * 2 + 1
                        draw_y = self.current_piece.y + y + 1
                        
                        if 0 <= draw_y <= self.board_height: # 下限チェック
                            try:
                                self.stdscr.addstr(draw_y, draw_x, '■', curses.color_pair(self.current_piece.color))
                            except curses.error:
                                pass

        # 枠描画
        # 横幅: 10 * 2 = 20文字. +2 (border)
        # 縦幅: 20 * 1 = 20行. +2 (border)
        
        # 上下の枠
        for x in range(self.board_width * 2 + 2):
            self.stdscr.addstr(0, x, '#')
            self.stdscr.addstr(self.board_height + 1, x, '#')
        
        # 左右の枠
        for y in range(self.board_height + 2):
            self.stdscr.addstr(y, 0, '#')
            self.stdscr.addstr(y, self.board_width * 2 + 1, '#')

        # UI描画 (右側に配置)
        ui_x = self.board_width * 2 + 5
        self.stdscr.addstr(2, ui_x, f"SCORE: {self.score}")
        self.stdscr.addstr(4, ui_x, f"LEVEL: {self.level}")
        self.stdscr.addstr(6, ui_x, "NEXT:")
        for y, row in enumerate(self.next_piece.shape):
            for x, cell in enumerate(row):
                if cell:
                    self.stdscr.addstr(8 + y, ui_x + x * 2, '■', curses.color_pair(self.next_piece.color))
        
        if self.paused:
            self.stdscr.addstr(self.board_height // 2, self.board_width - 2, "PAUSED", curses.A_BOLD | curses.A_BLINK | curses.color_pair(7))

        if self.game_over:
            self.stdscr.addstr(10, ui_x, "GAME OVER", curses.A_BOLD | curses.A_BLINK)
            self.stdscr.addstr(12, ui_x, "Press 'Q' to quit", curses.A_BOLD)

        self.stdscr.refresh()


def get_level(stdscr):
    curses.echo()
    stdscr.addstr(5, 5, "Select Start Level (1-10): ")
    stdscr.refresh()
    while True:
        try:
            key = stdscr.getstr(5, 32, 2).decode('utf-8')
            level = int(key)
            if 1 <= level <= 10:
                curses.noecho()
                return level
        except ValueError:
            pass
        stdscr.addstr(6, 5, "Invalid input. Please enter 1-10.")
        stdscr.move(5, 32)
        stdscr.clrtoeol()
        stdscr.refresh()

def main(stdscr):
    # カラー初期化
    curses.start_color()
    curses.use_default_colors()
    try:
        for i, color in enumerate(COLORS):
            curses.init_pair(i + 1, color, -1) # 背景透明
    except curses.error:
        pass

    curses.curs_set(0) # カーソル非表示
    stdscr.nodelay(1) # 入力待ちしない
    stdscr.timeout(50) # getchの待ち時間(ms)

    start_level = 1
    
    # レベル選択のための設定（ブロック解除）
    stdscr.nodelay(0)
    try:
        start_level = get_level(stdscr)
    except Exception:
        start_level = 1
    stdscr.nodelay(1) # ゲーム中はノンブロッキングに戻す

    game = TetrisGame(stdscr, level=start_level)

    while True:
        key = stdscr.getch()
        
        if key == ord('Q'):
            break
        
        if not game.game_over:
            game.handle_input(key)
            game.update()
        else:
             pass

        try:
            game.draw()
        except curses.error:
            # 画面サイズ不足などで描画エラーが出ても落ちないようにする
            pass


if __name__ == '__main__':
    try:
        curses.wrapper(main)
    except KeyboardInterrupt:
        pass
