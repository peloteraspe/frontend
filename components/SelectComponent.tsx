import Select from 'react-select';
import makeAnimated from 'react-select/animated';

const animatedComponents = makeAnimated();

export interface OptionSelect  {
  value: string | number;
  label: string;
}


interface SelectComponentProps {
  options: OptionSelect[];
  value?: OptionSelect | OptionSelect[] | null;
  isSearchable?: boolean;
  isMulti?: boolean;
  onChange: (selectedOption: OptionSelect | OptionSelect[] | null) => void;
}

const SelectComponent: React.FC<SelectComponentProps> = (props: SelectComponentProps) => {
  const customStyles = {
    control: (provided: any, state: any) => ({
          ...provided,
          background: '#F7F7F7',
          border: '1px solid #54086F',
          borderRadius: '10px',
          color: '#000',
          boxShadow: 'none',
          cursor: 'pointer',
          fontFamily: 'Work Sans',
          '&:hover': {
            borderColor: '#54086F',
          },
    }),
    option: (provided: any, state: any) => ({
          ...provided,
          background: 'transparent',
          color: '#000',
          cursor: 'pointer',
          "@media only screen and (max-width: 760px)": {
            paddingLeft:  '1.5em', // Aplica condicionalmente si isGrouped es true
            paddingTop: '0.1em', // Reduce el padding superior
            paddingBottom: '0.1em', // Reduce el padding inferior
          },
          paddingLeft: '2em', // Aplica condicionalmente si isGrouped es true
          paddingTop: '0.25em', // Reduce el padding superior
          paddingBottom: '0.25em', // Reduce el padding inferior
          
          backgroundColor: state.isSelected
            ? 'transparent'
            : provided.backgroundColor, // Elimina el fondo azul para las opciones seleccionadas
          '&:hover': {
            backgroundColor: '#f0f0f0', // Cambia el color de fondo al pasar el ratón, si lo deseas
          },
    }),
    menu: (provided: any, state: any) => ({
      ...provided,
      background: '#E5E5E5',
      color: '#000',
      marginTop: '0px',
      fontSize: '1vw', 
      "@media only screen and (max-width: 780px)": {
          fontSize: '4vw',
        },
    }),
    singleValue: (provided: any, state: any) => ({
      ...provided,
      color: '#000',
    }),
    placeholder: (provided: any, state: any) => ({
      ...provided,
      color: '#000',

    }),
    indicatorSeparator: (provided: any, state: any) => ({
      ...provided,
      display: 'none',
    }),
    dropdownIndicator: (provided: any, state: any) => ({
      ...provided,
      color: '#000',
      transform: state.selectProps.menuIsOpen && 'rotate(180deg)',
      transition: 'all .2s ease',
    }),
    groupHeading: (provided: any, state: any) => ({
          ...provided,
          color: '#000',
          fontSize: '1.vw',
          fontFamily: 'Work Sans',
          fontWeight: '600',
          textTransform: 'normal',
          padding: '0 0.5em',
          "@media only screen and (max-width: 760px)": {
            fontSize: '3vw',
          },
    
    }),
    group: (provided: any, state: any) => ({
          ...provided,
          padding: '0 0.5em',
    }),
  };
  
  return (
    <Select
      value={props.value}
      onChange={(selectedOption)=>{
        props.onChange(selectedOption as OptionSelect | OptionSelect[] | null)
      }}
      styles={customStyles}
      noOptionsMessage={() => 'No hay opciones'}
      isSearchable={props.isSearchable || false}
      isMulti={props.isMulti || false}
      options={props.options}
      components={animatedComponents}
    />
  )
}

export default SelectComponent
