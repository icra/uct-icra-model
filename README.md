# ecoadvisor backend
Model for Ecoadvisor project (Icra).
Coded in pure Javascript (without GUI) without dependencies.

## status: under development
Steady state model by George Ekama.
Implemented by Lluís Bosch (lbosch@icra.cat).

## pending/todo/discuss/finish
- The mass of FeCl3 added is not equal to the extra iSS produced (i.e. 3000 kg FeCl3 produces 2417 kg iSS. The rest is Cl(-) ion?)
- Current DO K constant value is 0.0 (= it does not affect nitrification)
- Influent S-NOx consider in equations
- Add the extra iSS produced in chemical P removal to the wastage
- Deal with exceptions of fxm and Rsm
- Check again the Rsm formula from the book

## future items
- [denitrification] fx1 and fx3 (fraction mass of unaerated sludge)
- Add energy consumption module
- Add anaerobic digestion
- Add stoichiometry (for CO2(air) produced)

## solved/clear/discussed
* How to deal with incomplete BOD removal
  - unbiodegradable in wwtp is in the time the organics are in the plant
- [nitrification] mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
- Anoxic volume (fxt related, clear)
- Qw wastage (waste from reactor or sst)
- DO inhibition in nitrification
- pH sensitivity in nitrification
- Denitrification outputs (units and descriptions)
