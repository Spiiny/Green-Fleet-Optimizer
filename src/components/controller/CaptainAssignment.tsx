import { useState } from "react";
import { captains, vessels } from "../../data/fleet";

interface Props {
  selectedVesselId: string;
}

export default function CaptainAssignment({ selectedVesselId }: Props) {
  const [assignments, setAssignments] = useState<Record<string, string>>(
    Object.fromEntries(vessels.map((v) => [v.id, v.captainId]))
  );
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetVessel, setTargetVessel] = useState<string>(selectedVesselId);
  const [selectedCaptain, setSelectedCaptain] = useState<string>("");

  const getAssignedCaptain = (vesselId: string) =>
    captains.find((c) => c.id === assignments[vesselId]);

  const assign = () => {
    if (!targetVessel || !selectedCaptain) return;
    setAssignments((prev) => ({ ...prev, [targetVessel]: selectedCaptain }));
    setShowAssignModal(false);
  };

  return (
    <div className="p-6 space-y-5" style={{ background: "#FEFAEF" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-[#182350]">Captain Assignment</h3>
          <div className="text-xs font-sans text-[#737985]">
            Manage vessel-captain assignments across the fleet
          </div>
        </div>
        <button
          onClick={() => {
            setTargetVessel(selectedVesselId);
            setShowAssignModal(true);
          }}
          className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer text-white shadow-xs hover:bg-[#233370]"
          style={{ background: "#182350" }}
        >
          + Assign Captain
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Captains roster */}
        <div
          className="rounded-lg shadow-xs overflow-hidden"
          style={{ background: "#FFFFFF", border: "1px solid rgba(24, 35, 80, 0.2)" }}
        >
          <div className="px-4 py-3 border-b border-[#182350]/20 bg-[#FDFCF7]">
            <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider">
              Captain Roster
            </div>
          </div>
          <div className="divide-y divide-[#182350]">
            {captains.map((c) => {
              const assignedVessel = vessels.find((v) => assignments[v.id] === c.id);
              return (
                <div key={c.id} className="p-4 flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs"
                    style={{
                      background: "#EAF4FE",
                      color: "#182350",
                      border: "1px solid #AFD2FA",
                    }}
                  >
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#182350] text-sm">{c.name}</div>
                      <div
                        className="text-xs font-sans font-bold px-2 py-0.5 rounded"
                        style={
                          assignedVessel
                            ? { background: "#EAF4FE", color: "#182350", border: "1px solid #AFD2FA" }
                            : { background: "#F3EBDD", color: "#B9915E", border: "1px solid #E6D7C3" }
                        }
                      >
                        {assignedVessel ? "Assigned" : "Available"}
                      </div>
                    </div>
                    <div className="text-xs text-[#737985] mt-0.5 font-sans">
                      {c.rank} · {c.experience} yrs exp
                    </div>
                    <div className="text-xs text-[#3F4654] mt-1 font-sans">{c.specialization}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="text-[10px] font-sans px-1.5 py-0.5 rounded"
                          style={{
                            background: "#FAFAF5",
                            border: "1px solid rgba(24, 35, 80, 0.2)",
                            color: "#737985",
                          }}
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs font-sans">
                      <span className="text-[#737985]">{c.voyagesCompleted} voyages</span>
                      {assignedVessel && (
                        <span className="text-[#182350] font-bold">{assignedVessel.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vessel-captain matrix */}
        <div className="space-y-3">
          <div
            className="rounded-lg shadow-xs overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid rgba(24, 35, 80, 0.2)" }}
          >
            <div className="px-4 py-3 border-b border-[#182350]/20 bg-[#FDFCF7]">
              <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider">
                Vessel Assignments
              </div>
            </div>
            <div className="divide-y divide-[#182350]">
              {vessels.map((v) => {
                const captain = getAssignedCaptain(v.id);
                const isSelected = v.id === selectedVesselId;
                return (
                  <div
                    key={v.id}
                    className="p-4 transition-colors"
                    style={{ background: isSelected ? "#EAF4FE" : "transparent" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-bold text-[#182350]">{v.name}</div>
                        <div className="text-xs text-[#737985] font-sans">{v.type}</div>
                      </div>
                      <button
                        onClick={() => {
                          setTargetVessel(v.id);
                          setShowAssignModal(true);
                        }}
                        className="text-xs font-sans font-semibold px-2.5 py-1 rounded-lg border border-[#182350]/20 text-[#737985] hover:border-[#182350]/20 hover:text-[#182350] bg-white cursor-pointer transition-colors"
                      >
                        Change
                      </button>
                    </div>
                    {captain ? (
                      <div
                        className="flex items-center gap-3 p-2.5 rounded-lg"
                        style={{ background: "#FAFAF5", border: "1px solid rgba(24, 35, 80, 0.2)" }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: "#EAF4FE",
                            color: "#182350",
                            border: "1px solid #AFD2FA",
                          }}
                        >
                          {captain.avatar}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#182350]">{captain.name}</div>
                          <div className="text-[11px] text-[#737985] font-sans">
                            {captain.experience} yrs · {captain.voyagesCompleted} voyages
                          </div>
                        </div>
                        <div className="ml-auto text-xs font-sans font-bold text-[#182350]">
                          Active
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-2.5 rounded-lg text-xs text-rose-600 font-sans"
                        style={{ background: "#FEE2E2", border: "1px solid #FCA5A5" }}
                      >
                        ⚠ No Captain Assigned
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div
            className="p-4 rounded-lg shadow-xs"
            style={{ background: "#FFFFFF", border: "1px solid rgba(24, 35, 80, 0.2)" }}
          >
            <div className="text-xs font-sans text-[#182350] font-bold uppercase tracking-wider mb-3">
              Fleet Summary
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Total Captains", value: captains.length },
                {
                  label: "Assigned",
                  value: captains.filter((c) => Object.values(assignments).includes(c.id)).length,
                },
                {
                  label: "Available",
                  value: captains.filter((c) => !Object.values(assignments).includes(c.id)).length,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-lg"
                  style={{ background: "#FAFAF5", border: "1px solid rgba(24, 35, 80, 0.2)" }}
                >
                  <div className="text-xl font-extrabold font-sans text-[#182350]">{s.value}</div>
                  <div className="text-xs text-[#737985] mt-1 font-sans">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(24, 35, 80, 0.4)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="p-6 rounded-xl shadow-2xl w-[440px]"
            style={{ background: "#FFFFFF", border: "1px solid rgba(24, 35, 80, 0.2)" }}
          >
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-[#182350]/20">
              <h4 className="font-bold text-[#182350] text-sm">Assign Captain to Vessel</h4>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-[#737985] hover:text-[#182350] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-sans text-[#182350] font-bold uppercase tracking-wider block mb-1">
                  Vessel
                </label>
                <select
                  value={targetVessel}
                  onChange={(e) => setTargetVessel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-[#182350] outline-none font-sans"
                  style={{ background: "#FFFFFF", border: "1px solid rgba(24, 35, 80, 0.2)" }}
                >
                  {vessels.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-sans text-[#182350] font-bold uppercase tracking-wider block mb-2">
                  Select Captain
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {captains.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCaptain(c.id)}
                      className="p-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: selectedCaptain === c.id ? "#EAF4FE" : "#FFFFFF",
                        border: `1px solid ${selectedCaptain === c.id ? "#AFD2FA" : "#182350"}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: "#EAF4FE",
                            color: "#182350",
                            border: "1px solid #AFD2FA",
                          }}
                        >
                          {c.avatar}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#182350]">{c.name}</div>
                          <div className="text-xs text-[#737985] font-sans">
                            {c.rank} · {c.experience} yrs · {c.specialization}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-[#737985] border border-[#182350]/20 hover:bg-[#F7F5EE] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={assign}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer hover:bg-[#233370]"
                  style={{ background: "#182350" }}
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
