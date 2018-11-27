# ecoadvisor backend
Model for Ecoadvisor project (Icra).
Coded in pure Javascript (without GUI) without dependencies.

## status: under development
Steady state model by George Ekama.
Implemented by Lluís Bosch (lbosch@icra.cat).

## [AS MODEL]: items pending/to do/to be discussed with george
- [TODO] write george equations in pdf 
* [TBD] Input S-NOx is not considered in equations. Ask george.
  see 'nitrification.js'
  see 'denitrification.js'
- [TBD] kg of FeCl3 added is not equal to the extra iSS produced (i.e. 3000 kg FeCl3 produces 2417 kg iSS. The rest (583 kg) is Cl(-) ion?). Ask george.
- [TBD] Current DO "KO" constant value is 0.3 (µ = µ·DO/(DO + KO)). Ask george. Book says KO value is [0.3, 2.0].
- [TODO] Add the extra-iSS produced in CPR to the secondary wastage.
* [TODO] Nitrification requirements: 
  - fxt should be smaller than fxm 
  - Rs should be higher than Rsm
- [TODO] Check again Rsm formula (page 471, equation 140 is -> Rsm = 1/(µApHT·(1-fxm) - bnT) )

## [RIVER] items pending
* [TODO] n simulacions.  configuració: AS+NIT+DN (sense pst)
  - variar:
    - Rs:         [6, 8, 10, 12, 15, 20, 25, 30, 40]; //temps de residència (d)
    - DO:         [1, 1.5, 2, 2.5];                   //mgO/L
    - mass-FeCl3: [TBD];                              //kg/d | lluís c. enviarà valors
    - RAS:        [0.75:0.10:1.25];                   //ø
    - IR:         no variar, calcular optim i fer servir a cada iteració ('a-opt')
  - solució funció objectiu: conjunt inputs que donen un resultat de:
    - NH4 < 0.5 mg/L 
    - PO4 < 0.5 mg/L
    - mostra kg/d fang produït i kgO/d (FOt)

## future items (not discussed in detail)
- Add energy consumption module
- Add anaerobic digestion
- Add stoichiometry (for {CO2,N2}(air) produced)

## done/solved/clear/discussed
- [river] posar R20 i k per amoni i fosfat (matèria orgànica i NO3 futur)
- [river] canviar nomenclatura S-OP i S-FSA a PO4 i NH4
- [as model] How to deal with incomplete BOD removal -> unbiodegradable in wwtp is in the time the organics are in the plant
- [as model] Mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
- [as model] Anoxic volume (fxt related)
- [as model] pH sensitivity in nitrification
- [as model] DO inhibition in nitrification
- [as model] Denitrification outputs (units and descriptions)
- [as model] Qw wastage (waste from reactor or sst)
