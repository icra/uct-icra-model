//status: already integrated to denitrification

//inputs
let   VFA      = 50;      //mg/L
let   FBSO     = 186.7;   //mg/L
let   BPO      = 301;     //mg/L
let   Nti      = 71.9;    //mg/L
let   Nte      = 3.51;    //mg/L = KnT/(SF-1) + Nouse + Nobse
let   Sti      = 614;     //mg/L
let   fSup     = 0.0342;
let   a_prac   = 6;       //ø
let   s        = 1;       //ø      (RAS)
let   Oa       = 2;       //mgO/L
let   Os       = 1;       //mgO/L
let   SF       = 1.25;    //safety factor
let   K2T      = 0.0742;  //k2t
let   µA       = 0.283;   //1/d µA
let   bHT      = 0.214;   //1/d bH
let   bAT      = 0.0357;  //1/d bA
const YH       = 0.45;
const f_N_OHO  = 0.1;
const f_N_UPO  = 0.1;
const f_CV_UPO = 1.481;
const f_CV_OHO = 1.481;
const fH       = 0.2;

//pdf BalancedMLEEquations.pdf, page 3, between equation 11 and 12
(function calculate_Rs_balanced(){
  let A      = VFA + FBSO + BPO;                               //mgCOD/L
  let B      = (VFA+FBSO)/(VFA+FBSO+BPO)*(1-f_CV_OHO*YH)/2.86; //mgN/L
  let C      = Nti - Nte;                                      //mgN/L
  let D      = (a_prac*Oa + s*Os)/2.86; 
  let E      = (a_prac+s)/(a_prac+s+1);
  let Rs_top = C*E + D - A*B + A*SF*K2T*YH/µA - E*(f_N_OHO*A*YH + f_N_UPO*Sti*fSup/f_CV_UPO);
  let Rs_bot = A*(B*bHT + K2T*YH) - A*SF*bAT*K2T*YH/µA - bHT*(C*E+D) + E*bHT*(f_N_OHO*A*YH*fH + f_N_UPO*Sti*fSup/f_CV_UPO);
  let Rs_bal = Rs_top/Rs_bot;
  console.log({A,B,C,D,E,Rs_top,Rs_bot,Rs_bal});
})();
