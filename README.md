# ecoadvisor backend
lluís bosch (lbosch@icra.cat)

## status: under development
model for ecoadvisor project coded in pure Javascript without graphical user interface.

## things done
DO set point in nitrification
wastage formula in AS clear

## things to discuss
nitrification: pH sensitivity: `µAmpH -> µAm7.2 * Math.pow(2.35, pH-7.2)·K1·(Kmax-pH)/(Kmax-K2-pH)`
finish denitrification
add anaerobic digestion (future)
add stoichiometry (for CO2) (future)
