interface StatsProps {
  total: number;
  completed: number;
  active: number;
  highPriority: number;
  overdue: number;
}

export function Stats({ total, completed, active, overdue }: StatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
        <p className="text-2xl font-bold text-gray-800">{total}</p>
        <p className="text-xs text-gray-500">전체</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
        <p className="text-2xl font-bold text-blue-600">{active}</p>
        <p className="text-xs text-gray-500">미완료</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
        <p className="text-2xl font-bold text-green-600">{completed}</p>
        <p className="text-xs text-gray-500">완료</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
        <p className={`text-2xl font-bold ${overdue > 0 ? 'text-red-600' : 'text-gray-800'}`}>
          {overdue}
        </p>
        <p className="text-xs text-gray-500">지연</p>
      </div>
    </div>
  );
}
