/*
  Chemical P removal
  Metcalf & Eddy, Wastewater Engineering, 5th ed., 2014, page 484
*/

function chemical_P_removal(Q, PO4i, mass_FeCl3){
  //inputs and default values
  Q          = isNaN(Q)          ? 1  : Q;          //ML/d
  PO4i       = isNaN(PO4i)       ? 7  : PO4i;       //mg/L as P (calculated as "Pse" in 'activated-sludge.js')
  mass_FeCl3 = isNaN(mass_FeCl3) ? 50 : mass_FeCl3; //kg/d | mass of FeCl3 added 

  //molecular weights
  const M_Fe        = 55.845;   //g/mol (Fe molecular weight)
  const M_P         = 30.974;   //g/mol (P molecular weight)
  const M_FeCl3     = 162.195;  //g/mol (FeCl3 molecular weight)
  const M_FeH2PO4OH = 250.9646; //g/mol ((Fe)(1.6)(H2PO4)(OH)(3.8) molecular weight)
  const M_FeOH3     = 106.866;  //g/mol (FeOH3 molecular weight)

  //get moles of P available in PO4 (influent)
  let moles_P = Q*PO4i*1000/M_P; //moles/d of P

  //convert kg/d of FeCl3 to moles of Fe
  let mass_Fe  = M_Fe/M_FeCl3*mass_FeCl3; //kg/d of Fe
  let moles_Fe = mass_Fe*1000/M_Fe;       //moles/d Fe

  //get Fe/P mole ratio
  let Fe_P_mole_ratio = moles_Fe/moles_P; //mol_Fe/mol_P

  //get the PO4 effluent concentration from the Fe/P mole ratio
  //Fig 6-13, page 484, M&EA, 5th ed
  function get_PO4_eff(Fe_P_mole_ratio){
    /* 
      Calculate the residual soluble P concentration (C_P_residual), [mg/L] -> range: 0.01, 0.1, 1, 10 (log scale)
      Input: Fe to initial soluble P ratio, [mole/mole] -> range: 0, 1, 2, 3, 4, 5 (lineal scale)
    */

    //rename input to "inp"
    let inp = Fe_P_mole_ratio || 0;

    //min and max values are: 0.0001 and 8
    inp=Math.min(8,Math.max(0.0001,inp));

    //Figure 6-13 (Fe_P_mole ratio vs PO4_eff)
    let Figure=[
      {inp:8.00  , out:0.01},
      {inp:4.90  , out:0.02}, //if PO4e is less than 0.02 is not linear
      {inp:4.50  , out:0.03},
      {inp:4.20  , out:0.04},
      {inp:3.90  , out:0.05},
      {inp:3.80  , out:0.06},
      {inp:3.70  , out:0.07},
      {inp:3.50  , out:0.08},
      {inp:3.35  , out:0.09},
      {inp:3.30  , out:0.10}, //the example in the book has this value {PO4_eff:0.1, Fe_P_mole_ratio:3.3)
      {inp:2.60  , out:0.20},
      {inp:2.10  , out:0.30},
      {inp:2.00  , out:0.40},
      {inp:1.70  , out:0.50},
      {inp:1.50  , out:0.60},
      {inp:1.20  , out:0.70},
      {inp:1.10  , out:0.80},
      {inp:1.00  , out:0.90},
      {inp:1.00  , out:1.00}, //if PO4e is greater than 1, it's not linear anymore
      {inp:0.20  , out:2.00},
      {inp:0.10  , out:3.00},
      {inp:0.10  , out:4.00},
      {inp:0.01  , out:5.00},
      {inp:0.01  , out:6.00},
      {inp:0.005 , out:7.00},
      {inp:0.001 , out:8.00},
      {inp:0.001 , out:9.00},
      {inp:0.0001, out:10.0},
    ];

    //perform linear interpolation (only if the ratio is not in the Figure)
    if(Figure.filter(row=>{return row.inp==inp}).length==0) {
      let Inps=Figure.map(row=>row.inp).sort(); //sort the values in ascending order
      for(let i=1;i<Inps.length;i++){
        if ((Inps[i-1]<inp) && (inp<Inps[i])){
          var i_below = Inps[i-1];
          var i_above = Inps[i];
          break;
        }
      }
      //find output above and below (o_above and o_below)
      let percentage = (inp-i_below)/(i_above-i_below);
      let o_below = Figure.find(row=>{return row.inp==i_below}).out;
      let o_above = Figure.find(row=>{return row.inp==i_above}).out;
      let o_inter = o_below + (o_above-o_below)*percentage;
      return o_inter;
    }else{ 
      //input is in the Figure
      return Figure.find(row=>{return inp==row.inp}).out;
    }
  };

  //get PO4 effluent and PO4 removed
  let PO4e = mass_FeCl3 ? get_PO4_eff(Fe_P_mole_ratio) : PO4i; //mgP/L (Fig 6-13, page 484, M&EA, 5th ed, see function 'get_PO4_eff')
  PO4e     = Math.min(PO4i, PO4e);                             //ensure PO4e < PO4i
  let PO4_removed = Q*(PO4i - PO4e);                           //kgP/d

  //get extra iSS sludge produced
  let extra_iSS = PO4_removed*(M_FeH2PO4OH+M_FeOH3*(Fe_P_mole_ratio-1.6))/M_P; //kg_iSS/d

  //return cpr process variables
  return {
    Fe_P_mole_ratio: {value:Fe_P_mole_ratio, unit:"molFe/molP", descr:"Fe/P mole ratio"},
    PO4i:            {value:PO4i,            unit:"mgP/L",      descr:"PO4 available"},
    PO4e:            {value:PO4e,            unit:"mgP/L",      descr:"PO4 effluent"},
    PO4_removed:     {value:PO4_removed,     unit:"kgP/d",      descr:"P removed"},
    extra_iSS:       {value:extra_iSS,       unit:"kgiSS/d",    descr:"iSS produced by FeCl3 coprecipitation (Fe(OH)3 and Fe(1.6)H2PO4(OH)3.8)"},
  };
};

//export function
try{module.exports=chemical_P_removal;}catch(e){}

/*standalone test*/
(function(){
  return;
  let Q          = 25;   //ML/d
  let PO4i       = 8;    //mg/L
  let mass_FeCl3 = 3145; //kg
  let cpr = chemical_P_removal(Q, PO4i, mass_FeCl3);
  console.log(cpr);
})();
