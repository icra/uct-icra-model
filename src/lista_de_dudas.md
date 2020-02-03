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

1. S_NOx_RAS = 0.500 (mgCOD/L)
  - se usa para calcular S_FBSO_conv (fermentables disponibles para OHOs para conversión a VFA)
  * ¿nuevo input o se puede calcular?
  * ¿por qué la unidad és mgCOD/L, y no mgNOx/L?

2. f_CV = 1.481 (mass ratio of OHOs and PAO combined)
  - se usa en: cálculo MX_I y balance COD.
  * ¿nuevo input o se puede calcular si sabemos los ratios de cada uno y sus masas en el reactor?

3. f_AN = 0.1 (less or equal than fxm, anaerobic mass fraction, different from fxt)
  - se usa para calcular "S_FBSO_AN (fermentable lost in the effluent of last anaerobic reactor)"
  - se usa para cálculo "fx1" (fx1 = fxm - f_AN, es como si fuera el fango no aereado no anaeróbico, pero no estoy seguro).
  * ¿nuevo input o se puede calcular?
  * ¿qué es exactamente?

4. f_P_PAO = 0.3800 (gP/gVSS)
  - se usa para calcular P_bio_PAO (P eliminado biológicamente)
  - se usa para calcular Ps (P required for sludge production)
  * hay una fórmula para "f_P_PAO_calculated" debajo del cálculo de Ps, ¿cuál es la diferencia?
    - f_P_PAO_calculated = (Q*Pti*Rs - f_P_OHO*(MX_BH+MX_EH+MX_E_PAO) - f_P_UPO*MX_I)/MX_PAO;
  * ¿el valor cambia dependiendo del reactor?
  * ¿se puede calcular?

5. f_iPAO = 1.300 (giSS/gVSS)
  - inert fraction of PAO. not constant, has to be calculated (0.15 - 1.3) (1.3 is PAOs full of polyPP)
  - se usa para calcular MX_IO (kg iSS, inert solids).
  * ¿cómo se calcula? ¿es un nuevo input?

6. f_i = 0.150 (giSS/gVSS, inert fraction of OHO and PAO combined, aprox equal to OHO)
  - se usa para calcular MX_I (kg VSS inert mass, PAO+OHO)
  * ¿se puede calcular?

7. DO=0, y DO_RAS=0 (mgO/L)
  - se usan sólo para calcular "S_FBSO_conv (mgCOD/L, fermentable lost in the effluent of las anaerobic reactor)"
  * ¿estos números son 0 porque es la DO en el tanque anaeróbico?
  * ¿son un nuevo input, o se pueden calcular?

8. "Vp (m3)" en el ejemplo, es el volumen del reactor anaeróbico o el total?

9. S_b = 585 (mgCOD/L)
  - en el modelo tenemos:
    - Sbi: influent biodegradable COD (VFA+FBSO+BPO)
    - S_b: FBSO effluent concentration: cannot be higher than influent S_FBSO
  * ¿cuál de los dos es?

10. f_P_X_E = 0.025 (gP/gVSS): fraction of P in endogenous mass (OHO+PAO)
  - se usa para calcular P_bio_E (mgP/L, P removal de endogenous mass)
  - se usa para calcular f_P_TSS (gP/gTSS, P en total solids)
  * ¿se puede calcular?

11. f_P_X_I = 0.03 (gP/gVSS): UPO fraction of P in inert mas
  - se usa para calcular P_bio_I (mgP/L, P removal de inert solids)
  - se usa para calcular f_P_TSS (gP/gTSS, P en total solids)
  * ¿se puede calcular?

12. f_VT_PAO = 0.46 (gPAOVSS/gTSS): can be calculated
  - se usa para calcular f_P_TSS (gP/gTSS, P en total solids)
  * ¿cómo se calcula?

13. f_P_iSS = 0.02  (gP/giSS): fraction of P in iSS
  - se usa para calcular f_P_TSS (gP/gTSS, P en total solids)
  * ¿se puede calcular?
