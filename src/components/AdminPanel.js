import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import "./AdminPanel.css";

function AdminPanel({ onClose, userRole }) {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [pendingPins, setPendingPins] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [availableClasses, setAvailableClasses] = useState([]);
  const [permissions, setPermissions] = useState(null);

  const isSuperadmin = userRole === "superadmin";

  // Load users based on role
  const loadUsers = useCallback(async () => {
    if (isSuperadmin) {
      // Superadmin can see ALL users
      const usersResult = await api.getAllUsers();
      return usersResult.data?.users || usersResult.data?.items || [];
    } else {
      // Admin can only see students in their managed classes
      const permResult = await api.getAdminPermissions();
      const perms = permResult.data;
      setPermissions(perms);

      const managedClasses = perms?.managedClasses || [];
      if (managedClasses.length === 0) {
        return [];
      }

      // Load students from each managed class
      const allUsers = [];
      for (const className of managedClasses) {
        try {
          const classResult = await api.getStudentsByClass(className);
          const classUsers = classResult.data?.users || classResult.data?.items || [];
          allUsers.push(...classUsers);
        } catch (e) {
          console.error(`Error loading class ${className}:`, e);
        }
      }
      return allUsers;
    }
  }, [isSuperadmin]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load users based on role
      const usersList = await loadUsers();
      setUsers(usersList);

      // Extract unique classes for filter
      const classes = [...new Set(usersList
        .filter(u => u.studentClass)
        .map(u => u.studentClass)
      )].sort();
      setAvailableClasses(classes);

      // Load pending pins
      try {
        const pinsResult = await api.getPendingPins();
        setPendingPins(pinsResult.data?.items || []);
      } catch (e) {
        console.error("Error loading pending pins:", e);
      }

      // Load pending donations
      try {
        const donationsResult = await api.getPendingDonations();
        setPendingDonations(donationsResult.data?.donations || []);
      } catch (e) {
        console.error("Error loading pending donations:", e);
      }
    } catch (err) {
      setError(err.message || "Помилка завантаження даних");
    } finally {
      setIsLoading(false);
    }
  }, [loadUsers]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      donationAmount: user.donationAmount || 0,
      hasDonated: user.hasDonated || false,
      donationStatus: user.donationStatus || "pending",
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    // Validate based on status
    if (editForm.donationStatus === "verified" && editForm.donationAmount <= 0) {
      alert("Для підтвердження донату введіть суму більше 0");
      return;
    }

    setIsSaving(true);
    try {
      const userId = editingUser.userId || editingUser.id;

      // Build notes with status info
      const statusText = {
        pending: "Очікує перевірки",
        verified: "Підтверджено",
        rejected: "Відхилено"
      }[editForm.donationStatus];

      // Admin/Superadmin sets donation directly - auto-verified when amount > 0
      await api.setUserDonation(
        userId,
        editForm.donationStatus === "rejected" ? 0 : editForm.donationAmount,
        `Статус: ${statusText}. Встановлено адміністратором.`
      );

      const statusMessage = editForm.donationStatus === "verified"
        ? `Донат ${editForm.donationAmount} грн підтверджено`
        : editForm.donationStatus === "rejected"
        ? "Донат відхилено"
        : "Статус донату оновлено";

      alert(`${statusMessage} для ${editingUser.name}`);

      // Close modal first
      setEditingUser(null);
      setEditForm({});

      // Force full data reload to get fresh data from backend
      await loadData();
    } catch (err) {
      alert(err.message || "Помилка збереження");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (userId, userName) => {
    const newPassword = prompt(`Введіть новий пароль для ${userName}:`);
    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert("Пароль повинен містити мінімум 6 символів");
      return;
    }

    try {
      await api.resetUserPassword(userId, newPassword);
      alert("Пароль успішно змінено");
    } catch (err) {
      alert(err.message || "Помилка зміни пароля");
    }
  };

  const handleVerifyPin = async (pinId, approved) => {
    try {
      await api.verifyPin(pinId, approved);
      setPendingPins(prev => prev.filter(p => p.pinId !== pinId));
    } catch (err) {
      alert(err.message || "Помилка верифікації");
    }
  };

  const handleVerifyDonation = async (userId, amount) => {
    try {
      // Use setUserDonation which auto-verifies
      await api.setUserDonation(userId, amount, "Підтверджено адміністратором");
      // Force full data reload to get fresh data
      await loadData();
    } catch (err) {
      alert(err.message || "Помилка верифікації");
    }
  };

  const filteredUsers = filterClass
    ? users.filter(u => u.studentClass === filterClass)
    : users;

  const renderUsersTab = () => (
    <div className="admin-tab-content">
      <div className="admin-filters">
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="admin-filter-select"
        >
          <option value="">Всі класи</option>
          {availableClasses.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
        <span className="admin-user-count">
          Знайдено: {filteredUsers.length} користувачів
        </span>
      </div>

      <div className="admin-users-list">
        {filteredUsers.map(user => (
          <div key={user.userId} className="admin-user-card">
            <div className="admin-user-info">
              <div className="admin-user-name">{user.name}</div>
              <div className="admin-user-details">
                <span className="admin-user-type">
                  {user.userType === "student" ? "Учень" : "Вчитель"}
                </span>
                {user.studentClass && (
                  <span className="admin-user-class">{user.studentClass}</span>
                )}
                <span className={`admin-user-donation ${
                  (user.hasDonated || user.donationStatus === "verified") ? "donated" :
                  user.donationStatus === "pending" ? "pending" :
                  user.donationStatus === "rejected" ? "rejected" : ""
                }`}>
                  {(user.hasDonated || user.donationStatus === "verified")
                    ? `Донат: ${user.donationAmount || user.donation?.amount || 0} грн`
                    : user.donationStatus === "pending"
                    ? "Донат очікує"
                    : user.donationStatus === "rejected"
                    ? "Донат відхилено"
                    : "Без донату"}
                </span>
              </div>
            </div>
            <div className="admin-user-actions">
              <button
                className="admin-btn edit"
                onClick={() => handleEditUser(user)}
              >
                Редагувати
              </button>
              <button
                className="admin-btn password"
                onClick={() => handleResetPassword(user.userId, user.name)}
              >
                Змінити пароль
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPinsTab = () => (
    <div className="admin-tab-content">
      {pendingPins.length === 0 ? (
        <div className="admin-empty">Немає пінів на перевірку</div>
      ) : (
        <div className="admin-pins-list">
          {pendingPins.map(pin => (
            <div key={pin.pinId} className="admin-pin-card">
              <div className="admin-pin-header">
                <span className="admin-pin-user">{pin.userDisplayName}</span>
                <span className="admin-pin-region">{pin.regionName}</span>
              </div>
              <div className="admin-pin-description">{pin.description}</div>
              {pin.images && pin.images.length > 0 && (
                <div className="admin-pin-images">
                  {pin.images.map((img, idx) => (
                    <img key={idx} src={img} alt={`Pin ${idx + 1}`} />
                  ))}
                </div>
              )}
              <div className="admin-pin-actions">
                <button
                  className="admin-btn approve"
                  onClick={() => handleVerifyPin(pin.pinId, true)}
                >
                  Схвалити
                </button>
                <button
                  className="admin-btn reject"
                  onClick={() => handleVerifyPin(pin.pinId, false)}
                >
                  Відхилити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDonationsTab = () => (
    <div className="admin-tab-content">
      {pendingDonations.length === 0 ? (
        <div className="admin-empty">Немає донатів на перевірку</div>
      ) : (
        <div className="admin-donations-list">
          {pendingDonations.map(donation => (
            <div key={donation.donationId || donation.id} className="admin-donation-card">
              <div className="admin-donation-info">
                <span className="admin-donation-user">{donation.userName || donation.userDisplayName}</span>
                <span className="admin-donation-amount">
                  {donation.amount ? `${donation.amount} грн` : "Сума не вказана"}
                </span>
              </div>
              <div className="admin-donation-actions">
                <input
                  type="number"
                  placeholder="Сума"
                  className="admin-donation-input"
                  id={`donation-amount-${donation.donationId || donation.id}`}
                  defaultValue={donation.amount || ""}
                />
                <button
                  className="admin-btn approve"
                  onClick={() => {
                    const input = document.getElementById(`donation-amount-${donation.donationId || donation.id}`);
                    const amount = parseFloat(input.value) || 0;
                    if (amount <= 0) {
                      alert("Введіть суму донату більше 0");
                      return;
                    }
                    handleVerifyDonation(donation.userId, amount);
                  }}
                >
                  Підтвердити
                </button>
                <button
                  className="admin-btn reject"
                  onClick={() => {
                    // Setting amount to 0 effectively rejects the donation
                    handleVerifyDonation(donation.userId, 0);
                  }}
                >
                  Відхилити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-panel-overlay" onClick={onClose}>
      <div className="admin-panel-container" onClick={(e) => e.stopPropagation()}>
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">
            {isSuperadmin ? "Панель суперадміністратора" : "Панель адміністратора"}
          </h2>
          {!isSuperadmin && permissions?.managedClasses && (
            <span className="admin-panel-subtitle">
              Класи: {permissions.managedClasses.join(", ")}
            </span>
          )}
          <button className="admin-panel-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Користувачі
            <span className="admin-tab-count">{users.length}</span>
          </button>
          <button
            className={`admin-tab ${activeTab === "pins" ? "active" : ""}`}
            onClick={() => setActiveTab("pins")}
          >
            Піни
            {pendingPins.length > 0 && (
              <span className="admin-tab-badge">{pendingPins.length}</span>
            )}
          </button>
          <button
            className={`admin-tab ${activeTab === "donations" ? "active" : ""}`}
            onClick={() => setActiveTab("donations")}
          >
            Донати
            {pendingDonations.length > 0 && (
              <span className="admin-tab-badge">{pendingDonations.length}</span>
            )}
          </button>
        </div>

        <div className="admin-content">
          {isLoading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
              <p>Завантаження...</p>
            </div>
          ) : error ? (
            <div className="admin-error">
              <p>{error}</p>
              <button className="admin-btn" onClick={loadData}>
                Спробувати знову
              </button>
            </div>
          ) : (
            <>
              {activeTab === "users" && renderUsersTab()}
              {activeTab === "pins" && renderPinsTab()}
              {activeTab === "donations" && renderDonationsTab()}
            </>
          )}
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="admin-edit-overlay" onClick={() => setEditingUser(null)}>
            <div className="admin-edit-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="admin-edit-title">Редагування: {editingUser.name}</h3>

              <div className="admin-edit-info">
                <p><strong>Тип:</strong> {editingUser.userType === "student" ? "Учень" : editingUser.userType === "teacher" ? "Вчитель" : "Гість"}</p>
                {editingUser.studentClass && <p><strong>Клас:</strong> {editingUser.studentClass}</p>}
                <p><strong>Поточний статус донату:</strong> {
                  (editingUser.hasDonated || editingUser.donationStatus === "verified")
                    ? "Підтверджено"
                    : editingUser.donationStatus === "pending"
                    ? "Очікує перевірки"
                    : editingUser.donationStatus === "rejected"
                    ? "Відхилено"
                    : "Не підтверджено"
                }</p>
                {(editingUser.donationAmount || editingUser.donation?.amount) > 0 && (
                  <p><strong>Сума:</strong> {editingUser.donationAmount || editingUser.donation?.amount} грн</p>
                )}
              </div>

              <div className="admin-edit-form">
                <div className="admin-edit-field">
                  <label>Сума донату (грн):</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.donationAmount}
                    onChange={(e) => setEditForm({ ...editForm, donationAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="Введіть суму"
                  />
                </div>

                <div className="admin-edit-field">
                  <label>Статус донату:</label>
                  <select
                    value={editForm.donationStatus}
                    onChange={(e) => setEditForm({ ...editForm, donationStatus: e.target.value })}
                  >
                    <option value="pending">Очікує перевірки</option>
                    <option value="verified">Підтверджено</option>
                    <option value="rejected">Відхилено</option>
                  </select>
                  <small className="admin-edit-hint">
                    Статус впливає на відображення сертифікату користувачу
                  </small>
                </div>
              </div>

              <div className="admin-edit-actions">
                <button
                  className="admin-btn cancel"
                  onClick={() => setEditingUser(null)}
                  disabled={isSaving}
                >
                  Скасувати
                </button>
                <button
                  className="admin-btn save"
                  onClick={handleSaveUser}
                  disabled={isSaving}
                >
                  {isSaving ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
