#!/bin/bash

#compile "file.ms" to "file.ms.pdf"

file="formulas.ms"

# groff options
# -t  is for tbl (tables)
# -e  is for eqn (equations)
# -ms is file format
# -T pdf is for pdf
# -K utf-8 is for character encoding
groff -t -e -ms "$file" -T pdf -K utf-8 > "$file.pdf"
