# compile "file.ms" to "file.ms.pdf"
# groff options
# -t  is for tbl (tables preprocessor)
# -e  is for eqn (equations preprocessor)
# -ms is file format
# -T pdf is for pdf
# -K utf-8 is for character encoding

formulas.ms.pdf: formulas.ms
	groff -t -e -ms formulas.ms -T pdf -K utf-8 > formulas.ms.pdf

# vim: noexpandtab
	
