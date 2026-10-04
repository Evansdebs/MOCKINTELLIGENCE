import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OMRTemplatePage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.getStudents();
        setStudents(res.students || []);
      } catch (err) {
        console.error('Failed to load students', err);
      }
    };
    fetchStudents();
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(students.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(studentId => studentId !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const studentsToPrint = students.filter(s => selectedStudentIds.includes(s.id));

  return (
    <div className="bg-slate-50 min-h-screen pb-12 print:bg-white print:pb-0 print:min-h-0">
      {/* Non-printable controls */}
      <div className="max-w-4xl mx-auto p-6 print:hidden">
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={() => navigate('/scores/omr')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Scanner
          </button>
          <button
            onClick={handlePrint}
            disabled={studentsToPrint.length === 0}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Selected Templates
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-black text-slate-900 mb-4">Select Students for OMR Generation</h2>
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 sticky top-0 border-b">
                <tr>
                  <th className="p-3 w-10">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedStudentIds.length === students.length && students.length > 0}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-3 font-bold text-slate-700">Index Number</th>
                  <th className="p-3 font-bold text-slate-700">Student Name</th>
                  <th className="p-3 font-bold text-slate-700">Class</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-3">
                      <input 
                        type="checkbox" 
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-3 font-mono text-slate-600">{student.indexNumber}</td>
                    <td className="p-3 font-medium text-slate-900">{student.fullName}</td>
                    <td className="p-3 text-slate-600">{student.classRoom?.name || '-'}</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">No students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Printable OMR Sheets */}
      <div className="hidden print:block">
        {studentsToPrint.map((student, index) => (
          <div key={student.id} className="w-full h-screen page-break-after-always flex flex-col p-8">
            {/* OMR Header */}
            <div className="border-4 border-black p-4 mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-widest mb-2">Mock Performance Intelligence</h1>
                <h2 className="text-xl font-bold uppercase mb-4">Official OMR Answer Sheet</h2>
                
                <div className="space-y-4 text-sm font-bold uppercase">
                  <div className="flex items-end gap-2 border-b-2 border-black pb-1 w-96">
                    <span>Student Name:</span>
                    <span className="font-medium">{student.fullName}</span>
                  </div>
                  <div className="flex items-end gap-2 border-b-2 border-black pb-1 w-96">
                    <span>Class:</span>
                    <span className="font-medium">{student.classRoom?.name || '____________________'}</span>
                  </div>
                  <div className="flex items-end gap-2 border-b-2 border-black pb-1 w-96">
                    <span>Subject:</span>
                    <span className="font-medium">____________________</span>
                  </div>
                </div>
              </div>

              {/* Index Number Grid */}
              <div className="border-2 border-black p-3">
                <p className="text-center font-bold text-xs mb-2 uppercase">Index Number</p>
                <div className="flex gap-2 text-center">
                  {student.indexNumber.split('').map((char: string, i: number) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-6 h-8 border border-black flex items-center justify-center font-black text-lg mb-2">
                        {char}
                      </div>
                      <div className="space-y-1">
                        {['0','1','2','3','4','5','6','7','8','9'].map(num => (
                          <div 
                            key={num} 
                            className={`w-5 h-5 rounded-full border border-black flex items-center justify-center text-[8px] ${char === num ? 'bg-black text-black' : 'bg-white text-black'}`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-8 border border-black p-4 bg-slate-100 text-xs font-bold uppercase">
              <p>Instructions: Use an HB pencil only. Shade the circle completely. Erase mistakes completely.</p>
              <div className="flex items-center gap-4 mt-2">
                <span>Correct:</span>
                <div className="w-4 h-4 rounded-full bg-black"></div>
                <span className="ml-4">Incorrect:</span>
                <div className="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center">x</div>
              </div>
            </div>

            {/* Answer Grid */}
            <div className="flex-1 grid grid-cols-4 gap-8">
              {[0, 1, 2, 3].map(colIndex => (
                <div key={colIndex} className="space-y-3">
                  {Array.from({ length: 10 }).map((_, rowIndex) => {
                    const qNumber = colIndex * 10 + rowIndex + 1;
                    return (
                      <div key={qNumber} className="flex items-center justify-between">
                        <span className="font-bold w-6 text-right mr-2">{qNumber}.</span>
                        <div className="flex gap-2">
                          {['A', 'B', 'C', 'D'].map(opt => (
                            <div key={opt} className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold">
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Markers for scanning */}
            <div className="absolute top-4 left-4 w-6 h-6 bg-black"></div>
            <div className="absolute top-4 right-4 w-6 h-6 bg-black"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 bg-black"></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 bg-black"></div>

          </div>
        ))}
      </div>
      
      <style>{`
        @media print {
          .page-break-after-always {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};
