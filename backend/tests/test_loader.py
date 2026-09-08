import pytest
from fleetopt.io.loader import load_instance, validate, InstanceError

INST = load_instance("data")


def test_all_files_load():
    assert len(INST.vessels) == 11
    assert len(INST.ports) == 19
    assert len(INST.parcels) == 24
    assert INST.horizon_days == 60


def test_referential_integrity():
    codes = set(INST.ports)
    assert {a for a, _ in INST.legs} <= codes
    assert {b for _, b in INST.legs} <= codes
    assert {p.origin_port for p in INST.parcels.values()} <= codes
    assert {v.start_port for v in INST.vessels.values()} <= codes


def test_every_parcel_has_a_vessel():
    for p in INST.parcels.values():
        assert INST.compatible_vessels(p), p.parcel_id


def test_legs_are_bidirectional():
    for (a, b) in list(INST.legs):
        assert (b, a) in INST.legs, f"{a}->{b} has no reverse"


def test_draft_is_load_dependent():
    v = INST.vessels["V02"]
    assert v.draft_at(0.0) == pytest.approx(v.ballast_draft_m)
    assert v.draft_at(1.0) == pytest.approx(v.design_draft_m)
    assert v.draft_at(0.0) < v.draft_at(0.5) < v.draft_at(1.0)


def test_methanol_tonnage_doubles():
    """Half the LCV means double the mass for the same energy. Getting this
    wrong gives V10 twice the range it has."""
    vlsfo, meoh = INST.fuels["VLSFO"], INST.fuels["MEOH"]
    mj = vlsfo.energy_mj(100.0)
    assert meoh.tonnes_for_energy(mj) == pytest.approx(202.0, rel=0.02)


def test_validation_catches_broken_instance():
    bad = load_instance("data")
    v = bad.vessels["V01"]
    bad.vessels["V01"] = type(v)(**{**v.__dict__, "start_port": "XXXXX"})
    with pytest.raises(InstanceError):
        validate(bad)
