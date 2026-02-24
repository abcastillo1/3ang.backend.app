export default function (sequelize, DataTypes) {
  const Animal = sequelize.define(
    'Animal',
    {
      animalId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'animal_id'
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      purpose: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      speciesId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'species_id'
      },
      organizationfkId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'organizationfk_id'
      },
      establishmentsfkId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'establishmentsfk_id'
      },
      sex: {
        type: DataTypes.ENUM('Macho', 'Hembra'),
        allowNull: false
      },
      breed: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      birthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'birth_date'
      },
      fatherId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'father_id'
      },
      motherId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'mother_id'
      },
      entryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'entry_date'
      },
      entryType: {
        type: DataTypes.ENUM('Nacimiento', 'Compra', 'Transferencia'),
        allowNull: false,
        field: 'entry_type'
      },
      image: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      gallery: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      color: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      race: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('Activo', 'Inactivo', 'Vendido', 'Muerto'),
        defaultValue: 'Activo'
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at'
      }
    },
    {
      tableName: 'animals',
      timestamps: true,
      underscored: true
    }
  );

  Animal.associate = function (models) {
    Animal.belongsTo(models.Species, {
      foreignKey: 'species_id',
      as: 'species'
    });
    Animal.belongsTo(models.Organization, {
      foreignKey: 'organizationfk_id',
      as: 'organization'
    });
    Animal.belongsTo(models.Establishment, {
      foreignKey: 'establishmentsfk_id',
      as: 'establishment'
    });
    Animal.belongsTo(models.Animal, {
      foreignKey: 'father_id',
      as: 'father'
    });
    Animal.belongsTo(models.Animal, {
      foreignKey: 'mother_id',
      as: 'mother'
    });
  };

  return Animal;
}
