## Model assumptions
  - The modelled WWTP process is MLE (Modified Ludzack Ettinger).
  - Influent X.OHO is always 0.
  - Mass of nitrifiers (MX.BA) is not considered into total solids mass MX.T.
  - Influent S.VFA and X.BPO are 100% consumed (converted to biomass) during the 'activated sludge' process.
  - S.FBSO is *not* entirely consumed because it depends on the HRT (fast), whereas the X.BPO depends on Rs (slower).
  - The solids in the effluent (X.iSS, X.UPO, X.OHO, X.BPO) are 0 (they all go to the wastage "Qw").
  - All CO<sub>2</sub> produced is stripped out.
  - Inorganic carbon is not included in the carbon balance over the AS reactor, because it's very small.
  - The volume of added FeCl3 solution for chemical P removal is ~0.

## Documentation
  - docs/equations: "formulas/formulas.ms" file is compiled into "formulas/formulas.ms.pdf" using groff(1).
  - docs/architecture: "architecture/architecture.org" file is compiled into "architecture/architecture.html" using emacs(1) org-mode export function.
