"use client";

import { useCallback, useEffect, useState } from "react";
import type { Home } from "@/lib/myHome";
import { createHome, fetchMyHomeData } from "@/lib/myHome";
import "./my-home.css";

const EMPTY_FORM = {
  apartmentName: "",
  address: "",
  apartmentNumber: "",
  city: "",
  state: "",
  zipCode: "",
};

export default function MyHomePage() {
  const [currentHome, setCurrentHome] = useState<Home | null>(null);
  const [previousHomes, setPreviousHomes] = useState<Home[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchMyHomeData();

    if (!result.ok) {
      setError(result.message);
      setCurrentHome(null);
      setPreviousHomes([]);
    } else {
      setCurrentHome(result.data.currentHome);
      setPreviousHomes(result.data.previousHomes);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await createHome({
      name: form.apartmentName,
      address: form.address,
      apartmentNumber: form.apartmentNumber,
      city: form.city,
      state: form.state,
      zip: form.zipCode,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setCurrentHome(result.data.currentHome);
    setPreviousHomes(result.data.previousHomes);
    closeModal();
  };

  return (
    <div className="my-home-page">
      <header className="my-home-topbar">
        <h1 className="my-home-page-title">My Home</h1>
        {!loading && currentHome === null ? (
          <button
            type="button"
            className="my-home-btn-primary"
            onClick={openModal}
          >
            Add a Home
          </button>
        ) : null}
      </header>

      {error && !showModal ? (
        <p className="my-home-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="my-home-section" aria-labelledby="current-home-heading">
        <h2 id="current-home-heading" className="my-home-section-title">
          Current home
        </h2>
        <div className="my-home-card">
          {loading ? (
            <p className="my-home-empty">Loading…</p>
          ) : currentHome ? (
            <>
              <p className="my-home-home-name">{currentHome.name}</p>
              <p className="my-home-home-address">{currentHome.address}</p>
            </>
          ) : (
            <p className="my-home-empty">No current home selected</p>
          )}
        </div>
      </section>

      <section className="my-home-section" aria-labelledby="previous-homes-heading">
        <h2 id="previous-homes-heading" className="my-home-section-title">
          Previous homes
        </h2>
        <div className="my-home-card">
          {loading ? (
            <p className="my-home-empty">Loading…</p>
          ) : previousHomes.length === 0 ? (
            <p className="my-home-empty">No previous homes</p>
          ) : (
            <ul className="my-home-list">
              {previousHomes.map((home) => (
                <li key={home.id} className="my-home-card">
                  <p className="my-home-home-name">{home.name}</p>
                  <p className="my-home-home-address">{home.address}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {showModal ? (
        <div
          className="my-home-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="my-home-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-home-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-home-modal-title" className="my-home-modal-title">
              Add a home
            </h2>
            <form className="my-home-form" onSubmit={handleSave}>
              <div className="my-home-field">
                <label htmlFor="apartment-name">Apartment Name</label>
                <input
                  id="apartment-name"
                  type="text"
                  value={form.apartmentName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, apartmentName: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div className="my-home-field">
                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div className="my-home-field">
                <label htmlFor="apartment-number">Apartment Number</label>
                <input
                  id="apartment-number"
                  type="text"
                  value={form.apartmentNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, apartmentNumber: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div className="my-home-form-row">
                <div className="my-home-field">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    type="text"
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="my-home-field">
                  <label htmlFor="state">State</label>
                  <input
                    id="state"
                    type="text"
                    value={form.state}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, state: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="my-home-field">
                <label htmlFor="zip">Zip Code</label>
                <input
                  id="zip"
                  type="text"
                  value={form.zipCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, zipCode: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>

              {error ? (
                <p className="my-home-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="my-home-modal-actions">
                <button
                  type="button"
                  className="my-home-btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="my-home-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
