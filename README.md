#ecoadvisor backend
Model for Ecoadvisor project (Icra).
Coded in pure Javascript (without GUI) without dependencies.

##status: under development
Steady state model by George Ekama.
Implemented by Lluís Bosch (lbosch@icra.cat).

##pending/todo/discuss/finish
- Current DO K constant value (0.0) does not turn off nitrification when DO is low
- The model does not deal with influent S-NOx
- Deal with exceptions of fxm and Rsm
- Add the extra iSS produced in chemical P removal to the wastage
- kg of FeCl3 added are not equal to extra iSS produced
- Check again the Rsm formula from the book

##future items
- [denitrification] fx1 and fx3 (fraction mass of unaerated sludge)
- Add energy consumption module
- Add anaerobic digestion
- Add stoichiometry (for CO2(air) produced)

##solved/clear/discussed
* How to deal with incomplete BOD removal
  - unbiodegradable in wwtp is in the time the organics are in the plant
- [nitrification] mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
- Anoxic volume (fxt related, clear)
- Qw wastage (waste from reactor or sst)
- DO inhibition in nitrification
- pH sensitivity in nitrification
- Denitrification outputs (units and descriptions)
