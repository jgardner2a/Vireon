export default function Dashboard() {
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back to Vireon.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">Properties</p>
          <p className="text-2xl font-bold mt-2">0</p>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">Vireon IQ</p>
          <p className="text-2xl font-bold mt-2">--</p>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">Reports</p>
          <p className="text-2xl font-bold mt-2">0</p>
        </div>

      </div>

      {/* ACTIONS */}
      <div className="bg-white border rounded-xl p-5">

        <h2 className="font-semibold">Quick Actions</h2>

        <div className="mt-4 space-y-2">

          <button className="w-full text-left px-3 py-2 border rounded-lg hover:bg-gray-50">
            Add Property
          </button>

          <button className="w-full text-left px-3 py-2 border rounded-lg hover:bg-gray-50">
            Upload Evidence
          </button>

          <button className="w-full text-left px-3 py-2 border rounded-lg hover:bg-gray-50">
            Generate Report
          </button>

        </div>

      </div>

    </div>
  );
}