LISTA DUDAS BIO P REMOVAL
=========================

Dudas del archivo "bio P standalone implementation" validado con
George Ekama
https://github.com/icra/uct-icra-model/blob/master/src/bio-p-removal.js

Nota: las variables que no consigamos averiguar cómo se calculan se tendrán que
preguntar al usuario (nuevos inputs que estarán relacionados con "Bio P removal").

Leyenda:
  - : aclaración
  * : duda

7. DO=0, y DO_RAS=0 (mgO/L)
  - se usan sólo para calcular "S_FBSO_conv (mgCOD/L, fermentable lost in the effluent of las anaerobic reactor)"
  * ¿estos números son 0 porque es la DO en el tanque anaeróbico?
  * ¿son un nuevo input, o se pueden calcular?

12. f_VT_PAO = 0.46 (gPAOVSS/gTSS): can be calculated
  - se usa para calcular f_P_TSS (gP/gTSS, P en total solids)
  * ¿cómo se calcula?

* DO is the one that we already ask?

* inorganic soluble P available for chemical P removal
  let Psa = Math.max(0, Pti - Ps - Pouse - Pobse - P_bio_rem); //mgP/L
  Ps and P_bio_rem is the same, is it possible that this is accounted 2 times?

* single tank is the same as number_of_an_zones==1?

* se puede tener bio P sin nitrificación?
