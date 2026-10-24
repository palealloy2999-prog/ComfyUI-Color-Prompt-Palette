日本語 | [English](README.md)

# ComfyUI Color Prompt Palette

パレットを1つ選択し、複数行プロンプトの `__color1__`〜`__color5__` を色名に置換します。カテゴリボタンは全カテゴリを連続表示する一覧内のスクロールナビゲーションです。カテゴリ、パレット、各2〜5色の配色は `web/palettes.json` から読み込みます。


<img width="843" height="603" alt="image" src="https://github.com/user-attachments/assets/7de742a3-4e74-4bf6-92d1-5135ed3c642f" />

## Installation
```
cd ComfyUI/custom_nodes
git clone https://github.com/palealloy2999-prog/ComfyUI-Color-Prompt-Palette
```

## 導入・使い方

**PALEALLOY / Prompt → Color Prompt Palette** を追加し、`template_text` ピンに外部STRINGを接続して、パレットをクリックします。ノード内にプロンプト入力欄・置換結果プレビュー欄はありません。ノードはリサイズできます。色・画像・themeだけを使う場合は `template_text` を未接続にでき、その場合の `replaced_text` は空文字です。

出力順は `replaced_text`、`color1`、`color2`、`color3`、`color4`、`color5`（STRING）、`palette_image`（IMAGE）、`theme`（STRING）です。未定義の色出力は空文字で、対応するプレースホルダーは原文に残します。大文字小文字を区別して1回だけ置換し、その他の文字は保持します。

`theme` は定義済みの各色名に ` theme` を付け、色順にカンマと空白で連結します。例：`slate navy theme, dusty mauve theme, muted coral theme, warm beige theme`。パレットIDが存在しない場合は空文字を返します。

画像は均等幅の縦ストライプだけの128×128 RGBパレット参照画像です。ControlNet/T2I-Adapterとの効果・互換性は保証しません。実行時に画像ファイルを保存しません。

選択IDと最後にカテゴリボタンで移動したカテゴリはワークフローに保存します。削除されたIDは再選択が必要です。そのまま実行するとエラーログを記録し、原文・空の色文字列・黒画像を返します。

`color` プルダウン（`2`、`3`、`4`、`5`、`all`、初期値 `all`）では、各パレットの `colors` 配列の長さが完全に一致するカードだけで一覧を再構築します。対象外のカードとカテゴリ見出しは一覧から除去し、該当パレットのないカテゴリボタンも非表示にします。絞り込み条件はノードごとにワークフローへ保存します。選択中パレットが変更後の色数と一致しない場合は選択を解除し、表示中のパレットをユーザーが選ぶまで未選択状態にします。この未選択状態もワークフローから復元します。`all` または現在と同じ色数への変更では選択を維持します。

## パレットデータ

カテゴリとパレットは `web/palettes.json` の編集だけで追加できます。一意で安定したID、存在するカテゴリ参照、順序付きの2〜5色、`#RRGGBB`、空でない色表現 `prompt` を指定してください。カテゴリ・パレットは `order` 昇順で、同値ならJSON配列順です。変更後はComfyUI再起動とブラウザ更新が必要です。不正データは黙って除外せずエラーを表示します。

`example_workflows/color_prompt_palette.json` に外部テキスト入力と、置換結果・画像・themeのプレビューのサンプルがあります。テストはComfyUIのPythonで `tests/test_palette.py`、Node.jsで `node tests/frontend.mjs` を実行します。

