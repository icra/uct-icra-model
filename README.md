# ecoadvisor backend
Model for icra's ecoadvisor project.
Coded in pure Javascript (without GUI)

## status: under development
Steady state model by George Ekama.
Implemented by Lluís Bosch (lbosch@icra.cat).

## items pending/todo/discuss/finish
- Anoxic volume
- How to deal with incomplete BOD removal
- [P removal] ask george if we should consider that the Q changes when we add a volume of FeCl3
  for example, 25 ML/d with [PO4]=7 mg/L need 6 ML/d of FeCl3 37%, making 31 ML/d
- ask george if the HRT changes when using SST as wastage
- [nitrification] mass of nitrifiers (MX-BA): add to MX-T?
- [denitrification] fx1 and fx3 (fraction mass of unaerated sludge)
- add energy consumption module
- add anaerobic digestion (future)
- add stoichiometry (for CO2(air) produced) (future)

## items solved
- Qw wastage (waste from reactor or sst)
- DO inhibition in nitrification
- pH sensitivity in nitrification
- denitrification outputs (units and descriptions)
