Report
======

Resum de la feina feta per Lluís Bosch en relació a la factura 2020-0001 (amb
data 29/02/2020) (comanda nº 20200212 feta per ICRA amb data 19/02/2020).

*Objectiu*: implementació d'un mòdul per simular l'eliminació biològica de
fòsfor dins el software ja implementat "UCT-ICRA-model" per ampliar el seu
ventall de processos simulats (juntament amb els ja existents: sedimentador
primari, fangs actius, nitrificació, desnitrificació, eliminació química de
fòsfor i sedimentador secundari).

*descripció feina feta*: s'han implementat (en el llenguatge de programació
Javascript) totes les equacions del capítol 7 "Enhanced Biological Phosphorus
Removal" del llibre "Biological Wastewater Treatment: Principles, Modelling and
Design", 2008, George A. Ekama. Edited by M. Henze, M.C.M. van Loosdrecht, G.A.
Ekama and D. Brdjanovic. ISBN: 9781843391883. Published by IWA Publishing,
London, UK).

El codi implementat està publicat al repositori públic de la plataforma online
de codi lliure GitHub "icra/uct-icra-model":
https://github.com/icra/uct-icra-model

concretament, al següent arxiu:
https://github.com/icra/uct-icra-model/blob/master/src/bio-p-removal.js

S'han hagut de readaptar els altres mòduls (en quant a estructura de
variables), ja que moltes de les variables calculades al mòdul "Bio P removal"
ja existien en altres mòduls, i per tant, calia substituir els valors ja
calculats amb noves equacions per incloure el comportament de la població de
bacteris coneguda com a "PAO" (Polyphosphate Accumulating Organisms, en les
seves sigles en anglès), que són els bacteris que duen a terme l'eliminació
biològica de fòsfor.

Aquest mòdul ha sigut testejat junt amb una implementació en Excel d'un dels
autors del llibre anteriorment esmentat (George Ekama), utilitzant les
característiques numèriques de les aigües residuals que apareixen a [WRC 1984,
EKAMA 2011, HENZE ET AL 2008, EKAMA 2017] i s'han obtingut resultats amb menys
d'un 0.1% de diferència, tant per aigua residual sedimentada (sedimentador
primari), com per aigua residual no sedimentada.

També s'ha dut a terme l'adaptació de la interfície gràfica per utilitzar el
model.  El resultat es pot visualitzar (i utilitzar, és a dir, executar el
model sencer i veure'n els resultats) al següent link:
http://ecoadvisor.icra.cat/uct-icra-model/run/

Es pot activar l'eliminació biològica de fòsfor a la secció
"Inputs/Configuration" fent click a la casella "Anaerobic (Bio P Removal)" i
finalment clicant el botó "Run model", fent servir els paràmetres per defecte.
Els resultats es poden visualitzar a la secció "Outputs" desplegant la secció
desitjada: "effluent" (efluent), "wastage" (purga), o "process variables"
(variables de procés).

Passant el ratolí per sobre cada variable es pot veure una petita descripció de
la variable, i passant el ratolí per sobre el número es pot veure el mateix
número amb més decimals.
