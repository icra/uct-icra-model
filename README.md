# ecoadvisor backend
Model backend for Ecoadvisor project. Coded in Javascript without dependencies.

## status: under development
Steady state model by George Ekama.
Implemented by Lluís Bosch (lbosch@icra.cat).

## doubts/pending
- SF value in nitrification (affects fxm, Rsm, Nae-fxm): Lluís C. does not like it.
- input (nitrate, NOx) ask george. TOD balance not closing.
- why is kg of FeCl3 added is not equal to the extra iSS produced (for example 3000 kg FeCl3 produces 2500 kg iSS. The remaining 500 kg is Cl(-) ion?). Ask george.
- current DO "KO" constant value is 0.3 (µ = µ·DO/(DO + KO)). Ask george. Book says KO value is [0.3, 2.0]. Which one I keep?
- check again Rsm formula (page 471, equation 140 is -> Rsm = 1/(µApHT·(1-fxm) - bnT) )

## Lluís B. tasks (ordered by priority)
- integrate constants.js to the code
- add errors in nitrification when: 
  - fxt > fxm
  - Rs  < Rsm
- write equations in pdf (file "formulas.ms")

## Future
- add energy consumption module
- add anaerobic digestion module
- add stoichiometry (for {CO2, N2}(air) produced)

## done/solved/clear/discussed
- [river] R20 and k for NH4 and PO4
- [river] names S-OP and S-FSA to PO4 and NH4 in the interface only
- [as model] add incomplete BOD removal
- [as model] mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
- [as model] anoxic volume (fxt related)
- [as model] pH sensitivity in nitrification
- [as model] DO inhibition in nitrification
- [as model] denitrification outputs (units and descriptions)
- [as model] Qw wastage (waste from reactor or sst)
- [as model] extra-iSS produced in CPR to wastage and MX-IO
