# ecoadvisor backend
Model backend for Ecoadvisor project. Coded in Javascript without dependencies.

## status: under development
Steady state model by George Ekama.
Implemented by Lluís Bosch (lbosch@icra.cat).

## doubts/pending
- Discuss SF in nitrification with George (fxm, Rsm, Nae)
- Should extra iSS from chemical P removal be added to MX-T?
- Input (nitrate, NOx) is not considered in equations. Ask george.
- Why is kg of FeCl3 added is not equal to the extra iSS produced (for example 3000 kg FeCl3 produces 2417 kg iSS. The rest (583 kg) is Cl(-) ion?). Ask george.
- Current DO "KO" constant value is 0.3 (µ = µ·DO/(DO + KO)). Ask george. Book says KO value is [0.3, 2.0].
- Check again Rsm formula (page 471, equation 140 is -> Rsm = 1/(µApHT·(1-fxm) - bnT) )

## Tasks
- Write equations in pdf
- Add errors in nitrification when: 
  - fxt > fxm
  - Rs  < Rsm

## Future
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
- [as model] Add the extra-iSS produced in CPR to the secondary wastage.
