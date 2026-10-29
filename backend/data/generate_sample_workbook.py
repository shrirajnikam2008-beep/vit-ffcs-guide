"""
Generates the authoritative multi-sheet Excel workbook (vit_winter_2026_27_allocation.xlsx)
from the user's transcribed VIT Vellore Winter Semester 2026-27 course allocation data
using openpyxl and csv.
"""
import csv
import io
import os
from openpyxl import Workbook

COURSE_SUMMARY_CSV = """Course Code,Course Title,Curriculum Category,Batch,Course Type,Credits,Lecture Hours,Tutorial Hours,Practical Hours,Project Hours,Lecture Slot,Lab/Tutorial Slot
BACHY105,Applied Chemistry,UCC,B1,ETL,4,3,0,2,0,C1+TC1,L43+L44
BACHY105,Applied Chemistry,UCC,B2,ETL,4,3,0,2,0,C2+TC2,L21+L22
BACHY105,Applied Chemistry,UCC,B3,ETL,4,3,0,2,0,C1+TC1,L37+L38
BACHY105,Applied Chemistry,UCC,B4,ETL,4,3,0,2,0,C2+TC2,L27+L28
BACHY105,Applied Chemistry,UCC,B5,ETL,4,3,0,2,0,C1+TC1,L49+L50
BACHY105,Applied Chemistry,UCC,B6,ETL,4,3,0,2,0,C2+TC2,L19+L20
BACHY105,Applied Chemistry,UCC,B7,ETL,4,3,0,2,0,C1+TC1,L31+L32
BACSE104,Structured and Object-Oriented Programming,PCC,B1,ETL,4,2,0,4,0,A1+TA1,L41+L42+L49+L50
BACSE104,Structured and Object-Oriented Programming,PCC,B2,ETL,4,2,0,4,0,A2+TA2,L9+L10+L23+L24
BACSE104,Structured and Object-Oriented Programming,PCC,B3,ETL,4,2,0,4,0,A1+TA1,L41+L42+L49+L50
BACSE104,Structured and Object-Oriented Programming,PCC,B4,ETL,4,2,0,4,0,A2+TA2,L11+L12+L25+L26
BACSE104,Structured and Object-Oriented Programming,PCC,B5,ETL,4,2,0,4,0,A1+TA1,L35+L36+L37+L38
BACSE104,Structured and Object-Oriented Programming,PCC,B6,ETL,4,2,0,4,0,A2+TA2,L1+L2+L27+L28
BACSE104,Structured and Object-Oriented Programming,PCC,B7,ETL,4,2,0,4,0,A1+TA1,L37+L38+L43+L44
BAENG101,Technical English Communication,UCC,B1,ETL,4,3,0,2,0,G1/G2,ANY SLOT
BAENG101,Technical English Communication,UCC,B2,ETL,4,3,0,2,0,G1/G2,ANY SLOT
BAHUM101,India Studies,UCC,B1,OC,1,0,0,0,0,OC,
BAHUM101,India Studies,UCC,B2,OC,1,0,0,0,0,OC,
BAHUM101,India Studies,UCC,B3,OC,1,0,0,0,0,OC,
BAHUM101,India Studies,UCC,B4,OC,1,0,0,0,0,OC,
BAHUM101,India Studies,UCC,B5,OC,1,0,0,0,0,OC,
BAHUM101,India Studies,UCC,B6,OC,1,0,0,0,0,OC,
BAHUM101,India Studies,UCC,B7,OC,1,0,0,0,0,OC,
BAITE101,Digital Logic Design and Computer Organization,PCC,B1,ETL,4,3,0,2,0,B1+TB1,L55+L56
BAITE101,Digital Logic Design and Computer Organization,PCC,B2,ETL,4,3,0,2,0,B2+TB2,L25+L26
BAITE101,Digital Logic Design and Computer Organization,PCC,B3,ETL,4,3,0,2,0,B1+TB1,L45+L46
BAITE101,Digital Logic Design and Computer Organization,PCC,B4,ETL,4,3,0,2,0,B2+TB2,L15+L16
BAITE101,Digital Logic Design and Computer Organization,PCC,B5,ETL,4,3,0,2,0,B1+TB1,L31+L32
BAITE101,Digital Logic Design and Computer Organization,PCC,B6,ETL,4,3,0,2,0,B2+TB2,L13+L14
BAITE101,Digital Logic Design and Computer Organization,PCC,B7,ETL,4,3,0,2,0,B1+TB1,L33+L34
BAITE102,Data Structures and Algorithms,PCC,B1,ETL,4,3,0,2,0,F1+TF1,L53+L54
BAITE102,Data Structures and Algorithms,PCC,B2,ETL,4,3,0,2,0,F2+TF2,L19+L20
BAITE102,Data Structures and Algorithms,PCC,B3,ETL,4,3,0,2,0,F1+TF1,L51+L52
BAITE102,Data Structures and Algorithms,PCC,B4,ETL,4,3,0,2,0,F2+TF2,L7+L8
BAITE102,Data Structures and Algorithms,PCC,B5,ETL,4,3,0,2,0,F1+TF1,L39+L40
BAITE102,Data Structures and Algorithms,PCC,B6,ETL,4,3,0,2,0,F2+TF2,L7+L8
BAITE102,Data Structures and Algorithms,PCC,B7,ETL,4,3,0,2,0,F1+TF1,L39+L40
BAITE103,Principles of Software Engineering,PCC,B1,ETL,4,3,0,2,0,E1+TE1,L45+L46
BAITE103,Principles of Software Engineering,PCC,B2,ETL,4,3,0,2,0,E2+TE2,L13+L14
BAITE103,Principles of Software Engineering,PCC,B3,ETL,4,3,0,2,0,E1+TE1,L33+L34
BAITE103,Principles of Software Engineering,PCC,B4,ETL,4,3,0,2,0,E2+TE2,L13+L14
BAITE103,Principles of Software Engineering,PCC,B5,ETL,4,3,0,2,0,E1+TE1,L41+L42
BAITE103,Principles of Software Engineering,PCC,B6,ETL,4,3,0,2,0,E2+TE2,L3+L4
BAITE103,Principles of Software Engineering,PCC,B7,ETL,4,3,0,2,0,E1+TE1,L49+L50
BAMAT207,Probability and Statistics,PCC,B1,ETL,4,3,0,2,0,D1+TD1,L37+L38
BAMAT207,Probability and Statistics,PCC,B2,ETL,4,3,0,2,0,D2+TD2,L1+L2
BAMAT207,Probability and Statistics,PCC,B3,ETL,4,3,0,2,0,D1+TD1,L31+L32
BAMAT207,Probability and Statistics,PCC,B4,ETL,4,3,0,2,0,D2+TD2,L3+L4
BAMAT207,Probability and Statistics,PCC,B5,ETL,4,3,0,2,0,D1+TD1,L47+L48
BAMAT207,Probability and Statistics,PCC,B6,ETL,4,3,0,2,0,D2+TD2,L5+L6
BAMAT207,Probability and Statistics,PCC,B7,ETL,4,3,0,2,0,D1+TD1,L35+L36"""

COMBINED_FACULTY_CSV = """Course,Slot Detail,Venue,Faculty,Course Type
India Studies,NIL,NIL,AQUIB PARVEZ,OC
India Studies,NIL,NIL,SHAHID HAMID RAINA,OC
India Studies,NIL,NIL,SARAVANA BHAVAN N,OC
India Studies,NIL,NIL,BANGALORE MORARJI,OC
India Studies,NIL,NIL,MULUGU S NEELOTPAL,OC
India Studies,NIL,NIL,RAMNATH REGHUNADHAN,OC
India Studies,NIL,NIL,RIZWAN AHMAD,OC
India Studies,NIL,NIL,SUDHEER C V,OC
India Studies,NIL,NIL,ADIL AHMAD SHAH,OC
German Level I,L59+L60,PRP555,ABHIJIT KR DARBEY,ELA
German Level I,L53+L54,PRP555,AMIT KUMAR SAINI,ELA
German Level I,L7+L8,PRP555,ARATI KUMARI,ELA
German Level I,TAA1,SJT505,DHANANJAY KUMAR,ETH
German Level I,L57+L58,PRP555,DHANANJAY KUMAR,ELA
German Level I,TBB2,SJT124,ARATI KUMARI,ETH
German Level I,TAA2,SJT302,ARATI KUMARI,ETH
German Level I,L19+L20,TT116,ARATI KUMARI,ELA
German Level I,L57+L58,TT116,ADAIKALAM ARULANANDAM,ELA
German Level I,TCC1,TT416,ADAIKALAM ARULANANDAM,ETH
German Level I,TCC1,SJT324,ABHIJIT KR DARBEY,ETH
German Level I,TCC1,SJT607,AMIT KUMAR SAINI,ETH
Structured and Object-Oriented Programming,A1,SJT102,RAMALINGAM M,ETH
Structured and Object-Oriented Programming,L41+L42+L49+L50,SJTG18,RAMALINGAM M,ELA
Structured and Object-Oriented Programming,A2,SJT102,RAMALINGAM M,ETH
Structured and Object-Oriented Programming,L9+L10+L23+L24,SJT122,RAMALINGAM M,ELA
Structured and Object-Oriented Programming,L41+L42+L49+L50,SJTG19,JENILA VINCENT M,ELA
Structured and Object-Oriented Programming,A2,SJT807,PRABHANANTHA KUMAR M,ETH
Structured and Object-Oriented Programming,L11+L12+L25+L26,SJT122,PRABHANANTHA KUMAR M,ELA
Structured and Object-Oriented Programming,A1,SJT715,VELLINGIRI J,ETH
Structured and Object-Oriented Programming,L35+L36+L37+L38,SJTG20,VELLINGIRI J,ELA
Structured and Object-Oriented Programming,A1,SJTG16,SURESH V J,ETH
Structured and Object-Oriented Programming,A1,SJT825,JENILA VINCENT M,ETH
Structured and Object-Oriented Programming,L1+L2+L27+L28,SJT122,JENIFA G,ELA
Structured and Object-Oriented Programming,L37+L38+L43+L44,SJT122,SURESH V J,ELA
Structured and Object-Oriented Programming,A2,SJT803,JENIFA G,ETH
Structured and Object-Oriented Programming,F1,SJTG16,JENILA VINCENT M,ETH
Structured and Object-Oriented Programming,L11+L12+L23+L24,SJTG19,JOHN SINGH K,ELA
Structured and Object-Oriented Programming,L33+L34+L35+L36,SJT121,JENILA VINCENT M,ELA
Structured and Object-Oriented Programming,F2,SJTG16,PRABHANANTHA KUMAR M,ETH
Structured and Object-Oriented Programming,L15+L16+L29+L30,SJT121,PRABHANANTHA KUMAR M,ELA
Structured and Object-Oriented Programming,L35+L36+L39+L40,SJT122,JOHN SINGH K,ELA
Structured and Object-Oriented Programming,F2,SJT223,NIVETHITHA K,ETH
Structured and Object-Oriented Programming,L37+L38+L51+L52,SJT121,NIVETHITHA K,ELA
Structured and Object-Oriented Programming,F2,SJT224,JOHN SINGH K,ETH
Structured and Object-Oriented Programming,F1,SJTG08,JOHN SINGH K,ETH
Structured and Object-Oriented Programming,F1,SJTG14,NIVETHITHA K,ETH
Structured and Object-Oriented Programming,L3+L4+L19+L20,SJT122,NIVETHITHA K,ELA
Digital Logic Design and Computer Organization,B2+TB2,SJT825,CHERUKULA MADHU,ETH
Digital Logic Design and Computer Organization,L55+L56,SJT212,KONGUVELE E,ELA
Digital Logic Design and Computer Organization,B1+TB1,SJT824,CHERUKULA MADHU,ETH
Digital Logic Design and Computer Organization,B1+TB1,SJT823,MANGAYARKARASI R,ETH
Digital Logic Design and Computer Organization,B1+TB1,SJT825,KONGUVELE E,ETH
Digital Logic Design and Computer Organization,L15+L16,SJT212,CHERUKULA MADHU,ELA
Digital Logic Design and Computer Organization,L31+L32,SJT212,MANGAYARKARASI R,ELA
Digital Logic Design and Computer Organization,B2+TB2,SJT824,ANIL KUMAR RAJPUT,ETH
Digital Logic Design and Computer Organization,L13+L14,SJT212,ANIL KUMAR RAJPUT,ELA
Digital Logic Design and Computer Organization,L45+L46,SJT212,CHERUKULA MADHU,ELA
Digital Logic Design and Computer Organization,B2+TB2,SJT324,KONGUVELE E,ETH
Digital Logic Design and Computer Organization,L25+L26,SJT212,KONGUVELE E,ELA
Digital Logic Design and Computer Organization,B1+TB1,SJT204,MOHAMMED ANEESH Y,ETH
Digital Logic Design and Computer Organization,L33+L34,SJT212,MOHAMMED ANEESH Y,ELA
Database Information Systems,D2+TD2,SJT127,JAYARAM REDDY A,ETH
Database Information Systems,L27+L28,SJTG17,JAYARAM REDDY A,ELA
Database Information Systems,L43+L44,SJTG17,JAGADEESAN S,ELA
Database Information Systems,L43+L44,SJTG18,TAMIL PRIYA D,ELA
Database Information Systems,L27+L28,SJTG19,TAMIL PRIYA D,ELA
Database Information Systems,D1+TD1,SJT126,JAYARAM REDDY A,ETH
Database Information Systems,D1+TD1,SJT127,JAGADEESAN S,ETH
Database Information Systems,D1+TD1,SJT215,TAMIL PRIYA D,ETH
Database Information Systems,L27+L28,SJTG18,JAGADEESAN S,ELA
Database Information Systems,L31+L32,SJTG20,JAYARAM REDDY A,ELA
Database Information Systems,D2+TD2,SJT215,JAGADEESAN S,ETH
Database Information Systems,D2+TD2,SJT221,TAMIL PRIYA D,ETH
Probability and Statistics,D2+TD2,PRP329,PADMA R,ETH
Probability and Statistics,D2+TD2,PRP424,ANIMESH ROY,ETH
Probability and Statistics,D2+TD2,PRP230,KAVITHA K,ETH
Probability and Statistics,D1+TD1,PRP329,VENKATESWARLU B,ETH
Probability and Statistics,D1+TD1,PRP424,KARTHIKA K,ETH
Probability and Statistics,D1+TD1,PRP425,PADMA R,ETH
Probability and Statistics,D1+TD1,PRP230,RAJA DAS,ETH
Probability and Statistics,L43+L44,PRP119,RAJA DAS,ELA
Probability and Statistics,L11+L12,PRP445,PADMA R,ELA
Probability and Statistics,L5+L6,PRP119,KAVITHA K,ELA
Probability and Statistics,L51+L52,PRP450,KARTHIKA K,ELA
Probability and Statistics,L35+L36,PRP119,PADMA R,ELA
Probability and Statistics,L19+L20,PRP119,ANIMESH ROY,ELA
Probability and Statistics,L51+L52,PRP449,VENKATESWARLU B,ELA
Probability and Statistics,L21+L22,PRP408A,BARNALI MAITI,ELA
Probability and Statistics,L37+L38,PRP408A,KARTHIKEYAN S,ELA
Probability and Statistics,L27+L28,PRP408A,SARVESWARI S,ELA
Probability and Statistics,L49+L50,PRPG07,SAI SARASWATHI V,ELA
Probability and Statistics,L9+L10,PRP408A,SUMATHI S,ELA
Probability and Statistics,L37+L38,PRPG07,MARY SARALA A,ELA
Probability and Statistics,L21+L22,PRPG07,DIVYA BHARATHI J,ELA
Probability and Statistics,L43+L44,PRP408A,KAMINI MISHRA,ELA
Probability and Statistics,L31+L32,PRP408A,U. VIJAYALAKSHMI,ELA
Probability and Statistics,L49+L50,PRP408A,RAJAGOPAL D,ELA
Probability and Statistics,L43+L44,PRPG07,MOHANA ROOPAN S,ELA
Probability and Statistics,L9+L10,PRP408A,KARPAGAM S,ELA
Probability and Statistics,L21+L22,PRPG07,VIJAYARAGHAVAN R,ELA
Probability and Statistics,L43+L44,PRP408A,MADHVESH PATHAK,ELA
Probability and Statistics,L49+L50,PRPG07,THENMOZHI K,ELA
Probability and Statistics,L19+L20,PRP408A,BUVANESWARI G,ELA
Probability and Statistics,L19+L20,PRP408A,SAI SARASWATHI V,ELA
Probability and Statistics,L37+L38,PRPG07,SASIKUMAR S,ELA
Probability and Statistics,L37+L38,PRP408A,MOHANA ROOPAN S,ELA
Probability and Statistics,L31+L32,PRP408A,NAWAZ KHAN F,ELA
Probability and Statistics,L49+L50,PRP408A,BUVANESWARI G,ELA
Probability and Statistics,L43+L44,PRPG07,KARTHIKEYAN S,ELA
Probability and Statistics,L21+L22,PRP408A,SUMATHI S,ELA
Probability and Statistics,L27+L28,PRP408A,MADHUMITHA G,ELA
Probability and Statistics,L19+L20,PRPG07,SREELEKHA U,ELA
Probability and Statistics,L19+L20,PRPG07,NAWAZ KHAN F,ELA
Data Structures and Algorithms,F1+TF1,SJT823,AGILANDEESWARL I,ETH
Data Structures and Algorithms,L53+L54,SJTG18,AGILANDEESWARL I,ELA
Data Structures and Algorithms,L19+L20,SJTG17,VIJAYAN E,ELA
Data Structures and Algorithms,F2+TF2,SJT825,VIJAYAN E,ETH
Data Structures and Algorithms,F1+TF1,SJT807,VIJAYAN E,ETH
Data Structures and Algorithms,L51+L52,SJT120,VIJAYAN E,ELA
Data Structures and Algorithms,F2+TF2,SJT215,PRIYA V,ETH
Data Structures and Algorithms,L7+L8,SJTG19,PRIYA V,ELA
Data Structures and Algorithms,F1+TF1,SJT825,PRIYA V,ETH
Data Structures and Algorithms,L39+L40,SJTG18,PRIYA V,ELA
Data Structures and Algorithms,L7+L8,SJTG20,RAGHAVAN R,ELA
Data Structures and Algorithms,F1+TF1,SJT803,RAGHAVAN R,ETH
Data Structures and Algorithms,F2+TF2,SJT823,RAGHAVAN R,ETH
Data Structures and Algorithms,L39+L40,SJTG20,RAGHAVAN R,ELA
Principles of Software Engineering,L45+L46,SJTG19,KARTHIKEYAN P,ELA
Principles of Software Engineering,L13+L14,SJTG17,KARTHIKEYAN P,ELA
Principles of Software Engineering,E1+TE1,SJTG14,KIRUBA THANGAM R,ETH
Principles of Software Engineering,E2+TE2,SJTG24,KARTHIKEYAN P,ETH
Principles of Software Engineering,L33+L34,SJTG17,KIRUBA THANGAM R,ELA
Principles of Software Engineering,E2+TE2,SJTG16,KIRUBA THANGAM R,ETH
Principles of Software Engineering,L41+L42,SJT121,THILAGAVATHI M,ELA
Principles of Software Engineering,E1+TE1,SJT807,KARTHIKEYAN P,ETH
Principles of Software Engineering,L13+L14,SJT122,KIRUBA THANGAM R,ELA
Principles of Software Engineering,L49+L50,SJT121,BHAVANI S,ELA
Principles of Software Engineering,E1+TE1,SJTG08,THILAGAVATHI M,ETH
Principles of Software Engineering,E2+TE2,SJTG14,THILAGAVATHI M,ETH
Principles of Software Engineering,L3+L4,SJT121,THILAGAVATHI M,ELA
Principles of Software Engineering,E1+TE1,SJT823,BHAVANI S,ETH
Applied Chemistry,C1+TC1,PRP329,SASIKUMAR S,ETH
Applied Chemistry,C1+TC1,PRP425,BUVANESWARI G,ETH
Applied Chemistry,C1+TC1,PRP223,THENMOZHI K,ETH
Applied Chemistry,C2+TC2,PRP329,VIJAYARAGHAVAN R,ETH
Applied Chemistry,C2+TC2,PRP425,SUMATHI S,ETH
Applied Chemistry,C2+TC2,PRP424,NAWAZ KHAN F,ETH
Applied Chemistry,C1+TC1,PRP426,KARTHIKEYAN S,ETH
Applied Chemistry,C1+TC1,PRP427,MADHVESH PATHAK,ETH
Applied Chemistry,C1+TC1,PRP429,MOHANA ROOPAN S,ETH
Applied Chemistry,C1+TC1,PRP112,NAWAZ KHAN F,ETH
Applied Chemistry,C2+TC2,PRP426,MADHUMITHA G,ETH
Applied Chemistry,C2+TC2,PRP427,BUVANESWARI G,ETH
Applied Chemistry,C2+TC2,PRP230,KARPAGAM S,ETH
Applied Chemistry,L21+L22,PRP408A,BARNALI MAITI,ELA
Applied Chemistry,L37+L38,PRP408A,KARTHIKEYAN S,ELA
Applied Chemistry,L27+L28,PRP408A,SARVESWARI S,ELA
Applied Chemistry,L49+L50,PRPG07,SAI SARASWATHI V,ELA
Applied Chemistry,L9+L10,PRP408A,SUMATHI S,ELA
Applied Chemistry,L37+L38,PRPG07,MARY SARALA A,ELA
Applied Chemistry,L21+L22,PRPG07,DIVYA BHARATHI J,ELA
Applied Chemistry,L43+L44,PRP408A,KAMINI MISHRA,ELA
Applied Chemistry,L31+L32,PRP408A,U. VIJAYALAKSHMI,ELA
Applied Chemistry,L49+L50,PRP408A,RAJAGOPAL D,ELA
Applied Chemistry,L43+L44,PRPG07,MOHANA ROOPAN S,ELA
Applied Chemistry,L9+L10,PRP408A,KARPAGAM S,ELA
Applied Chemistry,L21+L22,PRPG07,VIJAYARAGHAVAN R,ELA
Applied Chemistry,L43+L44,PRP408A,MADHVESH PATHAK,ELA
Applied Chemistry,L49+L50,PRPG07,THENMOZHI K,ELA
Applied Chemistry,L19+L20,PRP408A,BUVANESWARI G,ELA
Applied Chemistry,L19+L20,PRP408A,SAI SARASWATHI V,ELA
Applied Chemistry,L37+L38,PRPG07,SASIKUMAR S,ELA
Applied Chemistry,L37+L38,PRP408A,MOHANA ROOPAN S,ELA
Applied Chemistry,L31+L32,PRP408A,NAWAZ KHAN F,ELA
Applied Chemistry,L49+L50,PRP408A,BUVANESWARI G,ELA
Applied Chemistry,L43+L44,PRPG07,KARTHIKEYAN S,ELA
Applied Chemistry,L21+L22,PRP408A,SUMATHI S,ELA
Applied Chemistry,L27+L28,PRP408A,MADHUMITHA G,ELA
Applied Chemistry,L19+L20,PRPG07,SREELEKHA U,ELA
Applied Chemistry,L19+L20,PRPG07,NAWAZ KHAN F,ELA"""

ORIGINAL_COURSE_LIST_CSV = """oft,ug,COURSE,COURSE CODE,COURSE TITLE,EMPLOYEE SCHOOL,Batch,COURSE TYPE,Strength,LECTURE HOURS,TUTORIAL HOURS,PRACTICAL HOURS,PROJECT HOURS,CREDITS,TYPE,slot,slot1
,I,BIT,BACHY105,Applied Chemistry,,B1,ETL,469,3,0,2,0,4,UCC,C1+TC1,L43+L44
,I,BIT,BACHY105,Applied Chemistry,,B2,ETL,469,3,0,2,0,4,UCC,C2+TC2,L21+L22
,I,BIT,BACHY105,Applied Chemistry,,B3,ETL,469,3,0,2,0,4,UCC,C1+TC1,L37+L38
,I,BIT,BACHY105,Applied Chemistry,,B4,ETL,469,3,0,2,0,4,UCC,C2+TC2,L27+L28
,I,BIT,BACHY105,Applied Chemistry,,B5,ETL,469,3,0,2,0,4,UCC,C1+TC1,L49+L50
,I,BIT,BACHY105,Applied Chemistry,,B6,ETL,469,3,0,2,0,4,UCC,C2+TC2,L19+L20
,I,BIT,BACHY105,Applied Chemistry,,B7,ETL,469,3,0,2,0,4,UCC,C1+TC1,L31+L32
,I,BIT,BACSE104,Structured and Object-Oriented Programming,SCORE,B1,ETL,469,2,0,4,0,4,PCC,A1+TA1,L41+L42+L49+L50
,I,BIT,BACSE104,Structured and Object-Oriented Programming,SCORE,B2,ETL,469,2,0,4,0,4,PCC,A2+TA2,L9+L10+L23+L24
,I,BIT,BACSE104,Structured and Object-Oriented Programming,SCORE,B3,ETL,469,2,0,4,0,4,PCC,A1+TA1,L41+L42+L49+L50
,I,BIT,BACSE104,Structured and Object-Oriented Programming,SCORE,B4,ETL,469,2,0,4,0,4,PCC,A2+TA2,L11+L12+L25+L26
,I,BIT,BACSE104,Structured and Object-Oriented Programming,SCORE,B5,ETL,469,2,0,4,0,4,PCC,A1+TA1,L35+L36+L37+L38
,I,BIT,BACSE104,Structured and Object-Oriented Programming,SCORE,B6,ETL,469,2,0,4,0,4,PCC,A2+TA2,L1+L2+L27+L28
,I,BIT,BACSE104,Structured and Object-Oriented Programming,SCORE,B7,ETL,469,2,0,4,0,4,PCC,A1+TA1,L37+L38+L43+L44
,I,BIT,BAENG101,Technical English Communication,,B1,ETL,94,3,0,2,0,4,UCC,G1/G2,ANY SLOT
,I,BIT,BAENG101,Technical English Communication,,B2,ETL,94,3,0,2,0,4,UCC,G1/G2,ANY SLOT
,I,BIT,BAHUM101,India Studies ,,B1,OC,469,0,0,0,0,1,UCC,OC,
,I,BIT,BAHUM101,India Studies ,,B2,OC,469,0,0,0,0,1,UCC,OC,
,I,BIT,BAHUM101,India Studies ,,B3,OC,469,0,0,0,0,1,UCC,OC,
,I,BIT,BAHUM101,India Studies ,,B4,OC,469,0,0,0,0,1,UCC,OC,
,I,BIT,BAHUM101,India Studies ,,B5,OC,469,0,0,0,0,1,UCC,OC,
,I,BIT,BAHUM101,India Studies ,,B6,OC,469,0,0,0,0,1,UCC,OC,
,I,BIT,BAHUM101,India Studies ,,B7,OC,469,0,0,0,0,1,UCC,OC,
,I,BIT,BAITE101,Digital Logic Design and Computer Organization,SCORE,B1,ETL,469,3,0,2,0,4,PCC,B1+TB1,L55+L56
,I,BIT,BAITE101,Digital Logic Design and Computer Organization,SCORE,B2,ETL,469,3,0,2,0,4,PCC,B2+TB2,L25+L26
,I,BIT,BAITE101,Digital Logic Design and Computer Organization,SCORE,B3,ETL,469,3,0,2,0,4,PCC,B1+TB1,L45+L46
,I,BIT,BAITE101,Digital Logic Design and Computer Organization,SCORE,B4,ETL,469,3,0,2,0,4,PCC,B2+TB2,L15+L16
,I,BIT,BAITE101,Digital Logic Design and Computer Organization,SCORE,B5,ETL,469,3,0,2,0,4,PCC,B1+TB1,L31+L32
,I,BIT,BAITE101,Digital Logic Design and Computer Organization,SCORE,B6,ETL,469,3,0,2,0,4,PCC,B2+TB2,L13+L14
,I,BIT,BAITE101,Digital Logic Design and Computer Organization,SCORE,B7,ETL,469,3,0,2,0,4,PCC,B1+TB1,L33+L34
,I,BIT,BAITE102,Data Structures and Algorithms,SCORE,B1,ETL,469,3,0,2,0,4,PCC,F1+TF1,L53+L54
,I,BIT,BAITE102,Data Structures and Algorithms,SCORE,B2,ETL,469,3,0,2,0,4,PCC,F2+TF2,L19+L20
,I,BIT,BAITE102,Data Structures and Algorithms,SCORE,B3,ETL,469,3,0,2,0,4,PCC,F1+TF1,L51+L52
,I,BIT,BAITE102,Data Structures and Algorithms,SCORE,B4,ETL,469,3,0,2,0,4,PCC,F2+TF2,L7+L8
,I,BIT,BAITE102,Data Structures and Algorithms,SCORE,B5,ETL,469,3,0,2,0,4,PCC,F1+TF1,L39+L40
,I,BIT,BAITE102,Data Structures and Algorithms,SCORE,B6,ETL,469,3,0,2,0,4,PCC,F2+TF2,L7+L8
,I,BIT,BAITE102,Data Structures and Algorithms,SCORE,B7,ETL,469,3,0,2,0,4,PCC,F1+TF1,L39+L40
,I,BIT,BAITE103,Principles of Software Engineering,SCORE,B1,ETL,469,3,0,2,0,4,PCC,E1+TE1,L45+L46
,I,BIT,BAITE103,Principles of Software Engineering,SCORE,B2,ETL,469,3,0,2,0,4,PCC,E2+TE2,L13+L14
,I,BIT,BAITE103,Principles of Software Engineering,SCORE,B3,ETL,469,3,0,2,0,4,PCC,E1+TE1,L33+L34
,I,BIT,BAITE103,Principles of Software Engineering,SCORE,B4,ETL,469,3,0,2,0,4,PCC,E2+TE2,L13+L14
,I,BIT,BAITE103,Principles of Software Engineering,SCORE,B5,ETL,469,3,0,2,0,4,PCC,E1+TE1,L41+L42
,I,BIT,BAITE103,Principles of Software Engineering,SCORE,B6,ETL,469,3,0,2,0,4,PCC,E2+TE2,L3+L4
,I,BIT,BAITE103,Principles of Software Engineering,SCORE,B7,ETL,469,3,0,2,0,4,PCC,E1+TE1,L49+L50
,I,BIT,BAMAT207,Probability and Statistics ,,B1,ETL,469,3,0,2,0,4,PCC,D1+TD1,L37+L38
,I,BIT,BAMAT207,Probability and Statistics ,,B2,ETL,469,3,0,2,0,4,PCC,D2+TD2,L1+L2
,I,BIT,BAMAT207,Probability and Statistics ,,B3,ETL,469,3,0,2,0,4,PCC,D1+TD1,L31+L32
,I,BIT,BAMAT207,Probability and Statistics ,,B4,ETL,469,3,0,2,0,4,PCC,D2+TD2,L3+L4
,I,BIT,BAMAT207,Probability and Statistics ,,B5,ETL,469,3,0,2,0,4,PCC,D1+TD1,L47+L48
,I,BIT,BAMAT207,Probability and Statistics ,,B6,ETL,469,3,0,2,0,4,PCC,D2+TD2,L5+L6
,I,BIT,BAMAT207,Probability and Statistics ,,B7,ETL,469,3,0,2,0,4,PCC,D1+TD1,L35+L36"""

PROB_STATS_CLEAN_CSV = """Course,Slot Detail,Venue,Faculty,Course Type
Probability and Statistics,D2+TD2,PRP329,PADMA R,ETH
Probability and Statistics,D2+TD2,PRP424,ANIMESH ROY,ETH
Probability and Statistics,D2+TD2,PRP230,KAVITHA K,ETH
Probability and Statistics,D1+TD1,PRP329,VENKATESWARLU B,ETH
Probability and Statistics,D1+TD1,PRP424,KARTHIKA K,ETH
Probability and Statistics,D1+TD1,PRP425,PADMA R,ETH
Probability and Statistics,D1+TD1,PRP230,RAJA DAS,ETH
Probability and Statistics,L43+L44,PRP119,RAJA DAS,ELA
Probability and Statistics,L11+L12,PRP445,PADMA R,ELA
Probability and Statistics,L5+L6,PRP119,KAVITHA K,ELA
Probability and Statistics,L51+L52,PRP450,KARTHIKA K,ELA
Probability and Statistics,L35+L36,PRP119,PADMA R,ELA
Probability and Statistics,L19+L20,PRP119,ANIMESH ROY,ELA
Probability and Statistics,L51+L52,PRP449,VENKATESWARLU B,ELA"""

NOTES_LINES = [
    "Semester shown in screenshots: Winter Semester 2026-27.",
    "The table with no visible course name has been labeled Applied Chemistry as instructed.",
    "Faculty/venue/slot entries were transcribed from screenshots; please verify any tiny or ambiguous text against the source images before FFCS selection.",
    "Original Course List is preserved from your uploaded workbook.",
    "The C1/C2 table has been assigned to Applied Chemistry; the D1/D2 table is listed under Probability and Statistics.",
]


def parse_csv_rows(csv_str: str):
    return list(csv.reader(io.StringIO(csv_str.strip())))


def write_rows_to_sheet(ws, rows):
    for r in rows:
        ws.append(r)


def build_workbook(out_path: str) -> str:
    wb = Workbook()
    # Sheet 1: Course Summary
    ws_sum = wb.active
    ws_sum.title = "Course Summary"
    write_rows_to_sheet(ws_sum, parse_csv_rows(COURSE_SUMMARY_CSV))

    # Sheet 2: Combined Faculty Options
    ws_comb = wb.create_sheet(title="Combined Faculty Options")
    comb_rows = parse_csv_rows(COMBINED_FACULTY_CSV)
    write_rows_to_sheet(ws_comb, comb_rows)

    # Sheet 3: Original Course List
    ws_orig = wb.create_sheet(title="Original Course List")
    write_rows_to_sheet(ws_orig, parse_csv_rows(ORIGINAL_COURSE_LIST_CSV))

    # Per-course sheets
    header = comb_rows[0]
    data_rows = comb_rows[1:]
    per_course_map = [
        ("India Studies", "India Studies"),
        ("German Level I", "German Level I"),
        ("SOOP", "Structured and Object-Oriented Programming"),
        ("DLD and CO", "Digital Logic Design and Computer Organization"),
        ("Database Info Systems", "Database Information Systems"),
        ("Probability and Statistics", None),
        ("DSA", "Data Structures and Algorithms"),
        ("Software Engineering", "Principles of Software Engineering"),
        ("Applied Chemistry", "Applied Chemistry"),
    ]
    for sheet_name, course_name in per_course_map:
        ws_c = wb.create_sheet(title=sheet_name)
        if course_name is None:
            write_rows_to_sheet(ws_c, parse_csv_rows(PROB_STATS_CLEAN_CSV))
        else:
            ws_c.append(header)
            for r in data_rows:
                if r and r[0] == course_name:
                    ws_c.append(r)

    ws_note = wb.create_sheet(title="Note")
    ws_note.append(["Note"])
    for line in NOTES_LINES:
        ws_note.append([line])

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    wb.save(out_path)
    return out_path


if __name__ == "__main__":
    target = os.path.join(os.path.dirname(__file__), "vit_winter_2026_27_allocation.xlsx")
    build_workbook(target)
    print(f"Workbook generated at: {target}")
