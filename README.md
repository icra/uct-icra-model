# ecoadvisor backend
Model for icra's ecoadvisor project.
Coded in pure Javascript (without GUI)

## status: under development
Steady state model by George Ekama.
Implemented by Lluís Bosch (lbosch@icra.cat).

## items pending/todo/discuss/finish
* How to deal with incomplete BOD removal
  - unbiodegradable in wwtp is in the time the organics are in the plant
- Check again the Rsm formula from the book
- Make clear in the GUI that HRT is nominal
- [future] Add energy consumption module
- [future] Add anaerobic digestion
- [future] Add stoichiometry (for CO2(air) produced)

## items solved/clear
- [denitrification] fx1 and fx3 (fraction mass of unaerated sludge) future extension
- [nitrification] mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
- Anoxic volume (fxt related, clear)
- Qw wastage (waste from reactor or sst)
- DO inhibition in nitrification
- pH sensitivity in nitrification
- Denitrification outputs (units and descriptions)
