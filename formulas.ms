.TL
Ecoadvisor project formulas
.AU
Noms autors
.AI
Institut Català de Recerca de l'Aigua (ICRA)
.SH
Comanda per compilar
.PP
groff -e -ms formulas.ms -T pdf -K utf-8
.SH
Llista equacions
.IP
- state variables: fraccionament i mass ratios
.IP
- primary settler: formula genèrica per removal Qi*[conc]*removal/Qe

.NH
OHO biomass production rate
.EQ
Y sub H = 0.45 gVSS over gCOD
.EN
.EQ
b sub H = 0.24 d sup -1
.EN
.EQ
b sub {HT} = b sub H · theta sup {( T - 20 )} [{d sup -1}]
.EN
.EQ
f sub XBH = {Y sub H · Rs} over {1 + bHT·Rs} [{gVSS·d over gCOD}]
.EN

