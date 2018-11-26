# ecoadvisor backend
Model for Ecoadvisor project (Icra).
Coded in pure Javascript (without GUI) without dependencies.

## status: under development
Steady state model by George Ekama.
Implemented by Lluís Bosch (lbosch@icra.cat).

## pending/to do/to be discussed with george
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

## future items (not discussed in detail)
- Add energy consumption module
- Add anaerobic digestion
- Add stoichiometry (for {CO2,N2}(air) produced)

## solved/clear/discussed
- How to deal with incomplete BOD removal -> unbiodegradable in wwtp is in the time the organics are in the plant
- Mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
- Anoxic volume (fxt related)
- pH sensitivity in nitrification
- DO inhibition in nitrification
- Denitrification outputs (units and descriptions)
- Qw wastage (waste from reactor or sst)
