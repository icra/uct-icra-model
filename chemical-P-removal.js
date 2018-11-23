/*
  Chemical P removal
  Metcalf & Eddy, Wastewater Engineering, 5th ed., 2014, page 484

  Qi → [Chemical P removal] → Qe
*/

//import files
if(typeof document == "undefined"){ State_Variables = require("./state-variables.js"); }

State_Variables.prototype.chemical_P_removal=function(mass_FeCl3){
  //inputs and default values
  mass_FeCl3 = isNaN(mass_FeCl3) ? 50 : mass_FeCl3; //kg/d | mass of FeCl3 added 

  //molecular weights (constants)
  const M_Fe        = 55.845;   //g/mol (Fe molecular weight)
  const M_P         = 30.974;   //g/mol (P molecular weight)
  const M_FeCl3     = 162.195;  //g/mol (FeCl3 molecular weight)
  const M_FeH2PO4OH = 250.9646; //g/mol ((Fe)(1.6)(H2PO4)(OH)(3.8) molecular weight)
  const M_FeOH3     = 106.866;  //g/mol (FeOH3 molecular weight)

  //get flowrate (Q) and available P (PO4 = S_OP in state variables)
  let Q    = this.Q;               //ML/d
  let PO4i = this.components.S_OP; //mg/L as P (calculated as "Pse" in 'activated-sludge.js')

  //get moles of P available in PO4
  let moles_P = Q*PO4i*1000/M_P; //moles/d of P

  //convert kg/d of FeCl3 to moles of Fe
  let mass_Fe  = M_Fe/M_FeCl3*mass_FeCl3; //kg/d of Fe
  let moles_Fe = mass_Fe*1000/M_Fe;       //moles/d Fe

  //get Fe/P mole ratio
  let Fe_P_mole_ratio = moles_Fe/moles_P; //mol_Fe/mol_P

  //get PO4 effluent and PO4 removed
  let PO4e        = get_PO4_eff(Fe_P_mole_ratio); //mg/L (Fig 6-13, page 484, M&EA, 5th ed, see function below 'get_PO4_eff')
  PO4e            = Math.min(PO4i, PO4e);         //PO4e cannot be higher than PO4i (i.e. if mass of FeCl3 = 0)
  let PO4_removed = PO4i - PO4e;                  //mg/L

  //get extra iSS sludge produced
  let extra_iSS = Q*PO4_removed*(M_FeH2PO4OH+M_FeOH3*(Fe_P_mole_ratio-1.6))/M_P; //kg_iSS/d
  //chemical P removal end-----------------------------------------------------------------

  //new iSS concentration TODO: move this iSS to the wastage
  let X_iSS = this.components.X_iSS + extra_iSS/Q; //mg/L

  //new effluent
  let effluent=new State_Variables(
    this.Q, 
    this.components.S_VFA,
    this.components.S_FBSO, 
    this.components.X_BPO, 
    this.components.X_UPO, 
    this.components.S_USO, 
    X_iSS, 
    this.components.S_FSA, 
    PO4e, 
    this.components.S_NOx,
  );

  //process variables
  let process_variables={
    Fe_P_mole_ratio: {value:Fe_P_mole_ratio, unit:"molFe/molP", descr:"Fe/P mole ratio"},
    PO4i:            {value:PO4i,            unit:"mg/L_as_P",  descr:"PO4 available"},
    PO4e:            {value:PO4e,            unit:"mg/L_as_P",  descr:"PO4 effluent"},
    PO4_removed:     {value:PO4_removed,     unit:"mg/L_as_P",  descr:"Concentration of P removed"},
    extra_iSS:       {value:extra_iSS,       unit:"kgiSS/d",    descr:"iSS produced by FeCl3 coprecipitation"},
  };

  return {
    process_variables,
    effluent,
  }
};

//get the PO4 effluent concentration from the Fe/P mole ratio
//Fig 6-13, page 484, M&EA, 5th ed
function get_PO4_eff(Fe_P_mole_ratio){
  /* 
    Calculate the residual soluble P concentration (C_P_residual), [mg/L] -> range: 0.01, 0.1, 1, 10 (log scale)
    Input: Fe to initial soluble P ratio, [mole/mole] -> range: 0, 1, 2, 3, 4, 5 (lineal scale)
  */

  //rename input to "inp"
  let inp = Fe_P_mole_ratio || 0;

  //min and max values are: 0.0001 and 5
  inp=Math.min(5,Math.max(0.0001,inp));

  //Figure 6-13 (Fe_P_mole ratio vs PO4_eff)
  var Figure=[
    {inp:8.00   ,out:0.01},
    {inp:4.90   ,out:0.02}, //if output is less than 0.02 is not linear
    {inp:4.50   ,out:0.03},
    {inp:4.20   ,out:0.04},
    {inp:3.90   ,out:0.05},
    {inp:3.80   ,out:0.06},
    {inp:3.70   ,out:0.07},
    {inp:3.50   ,out:0.08},
    {inp:3.35   ,out:0.09},
    {inp:3.30   ,out:0.10}, //book example has this value {PO4_eff:0.1, Fe_P_mole_ratio:3.3)
    {inp:2.60   ,out:0.20},
    {inp:2.10   ,out:0.30},
    {inp:2.00   ,out:0.40},
    {inp:1.70   ,out:0.50},
    {inp:1.50   ,out:0.60},
    {inp:1.20   ,out:0.70},
    {inp:1.10   ,out:0.80},
    {inp:1.00   ,out:0.90},
    {inp:1.00   ,out:1.00}, //if input is greater than 1, it's no more linear
    {inp:0.20   ,out:2.00},
    {inp:0.10   ,out:3.00},
    {inp:0.10   ,out:4.00},
    {inp:0.01   ,out:5.00},
    {inp:0.01   ,out:6.00},
    {inp:0.005  ,out:7.00},
    {inp:0.001  ,out:8.00},
    {inp:0.001  ,out:9.00},
    {inp:0.0001 ,out:10.0},
  ];

  //perform linear interpolation (only if the ratio is not in the Figure)
  if(Figure.filter(row=>{return row.inp==inp}).length==0) {
    var Inps=Figure.map(row=>row.inp).sort(); //sort the values in ascending order
    for(var i=1;i<Inps.length;i++){
      if ((Inps[i-1]<inp) && (inp<Inps[i])){
        var i_below = Inps[i-1];
        var i_above = Inps[i];
        break;
      }
    }
    //find output above and below (o_above and o_below)
    var percentage = (inp-i_below)/(i_above-i_below);
    var o_below = Figure.find(row=>{return row.inp==i_below}).out;
    var o_above = Figure.find(row=>{return row.inp==i_above}).out;
    var o_inter = o_below + (o_above-o_below)*percentage;
    return o_inter;
  }else{ 
    //input is directly in the Figure values
    return Figure.find(row=>{return inp==row.inp}).out;
  }
};

/*test*/
(function(){
  return;
  //syntax---------------------(Q,     VFA, FBSO, BPO, UPO, USO, iSS, FSA, OP, NOx)
  let inf = new State_Variables(0.353, 0,   0,    0,   0,   0,   0,   0,   5,  0);
  let cpr = inf.chemical_P_removal(25);//input: mass_FeCl3
  //show results
  console.log(cpr.process_variables);
  console.log(cpr.effluent.summary);
})();
